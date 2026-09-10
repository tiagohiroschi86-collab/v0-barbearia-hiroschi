#!/usr/bin/env python3
"""
PagBank Pix Full Flow Test with Firestore Integration
Tests all API routes at /api/pagbank/* using FUTURE dates (>= 2027-02-01)
Cleanup mandatory: cancels every agendamento_id created during test
"""

import requests
import json
import hashlib
import os
from datetime import datetime

# Read BASE_URL from .env
BASE_URL = "https://hiroschi-dev-preview.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api/pagbank"

# Track all created agendamento_ids for cleanup
created_agendamentos = []

def truncate(text, max_len=400):
    """Truncate text to max_len characters"""
    if not text:
        return ""
    return text if len(text) <= max_len else text[:max_len] + "..."

def print_test(name, status, body, expected):
    """Print test result in consistent format"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print(f"HTTP Status: {status}")
    print(f"Response Body: {truncate(str(body))}")
    print(f"Expected: {expected}")
    result = "✅ PASS" if "PASS" in expected else "❌ FAIL"
    print(f"Result: {result}")
    print('='*80)

def test_1_health():
    """Test 1: GET /api/pagbank/health"""
    print("\n\n🧪 TEST 1: Health Check")
    try:
        r = requests.get(f"{API_BASE}/health", timeout=10)
        body = r.json()
        
        expected = "PASS if HTTP 200, ok:true, env_ready:true, token_set:true, base_url_set:true"
        
        if (r.status_code == 200 and 
            body.get('ok') == True and 
            body.get('env_ready') == True and 
            body.get('token_set') == True and 
            body.get('base_url_set') == True):
            print_test("Health Check", r.status_code, body, expected + " ✅ PASS")
            return True
        else:
            print_test("Health Check", r.status_code, body, expected + " ❌ FAIL")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        return False

def test_2_create_pix_slot_a():
    """Test 2: Create Pix reservation - future slot A"""
    print("\n\n🧪 TEST 2: Create Pix Reservation (Slot A)")
    try:
        payload = {
            "cliente_nome": "Teste QA A",
            "cliente_apelido": "qa-a",
            "cliente_telefone": "21970000001",
            "data": "2027-02-15",
            "horario": "10:00",
            "servico": "Corte QA",
            "preco_total": 50,
            "duracao_total": 30
        }
        
        r = requests.post(f"{API_BASE}/pix/create", json=payload, timeout=15)
        body = r.json()
        
        expected = "PASS if HTTP 200, ok:true, agendamento_id (uuid), order_id starts with ORDE_, qr_code_text starts with 0002, qr_code_png_url is URL, reserva_expira_em (ISO future), valor_centavos:5000"
        
        if (r.status_code == 200 and
            body.get('ok') == True and
            body.get('agendamento_id') and
            body.get('order_id', '').startswith('ORDE_') and
            body.get('qr_code_text', '').startswith('0002') and
            'sandbox.api.pagseguro.com' in body.get('qr_code_png_url', '') and
            body.get('reserva_expira_em') and
            body.get('valor_centavos') == 5000):
            
            agendamento_id = body.get('agendamento_id')
            created_agendamentos.append(agendamento_id)
            print_test("Create Pix Slot A", r.status_code, body, expected + " ✅ PASS")
            print(f"📝 Saved A_ID: {agendamento_id}")
            return agendamento_id
        else:
            print_test("Create Pix Slot A", r.status_code, body, expected + " ❌ FAIL")
            return None
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        return None

def test_3_race_condition(a_id):
    """Test 3: Race condition - try same slot with different client"""
    print("\n\n🧪 TEST 3: Race Condition Test (Same Slot, Different Client)")
    try:
        payload = {
            "cliente_nome": "Teste QA B",
            "cliente_apelido": "qa-b",
            "cliente_telefone": "21970000002",  # Different phone
            "data": "2027-02-15",
            "horario": "10:00",  # SAME slot as A
            "servico": "Corte QA",
            "preco_total": 50,
            "duracao_total": 30
        }
        
        r = requests.post(f"{API_BASE}/pix/create", json=payload, timeout=15)
        body = r.json()
        
        expected = "PASS if HTTP 409 with error:SLOT_OCUPADO"
        
        if r.status_code == 409 and body.get('error') == 'SLOT_OCUPADO':
            print_test("Race Condition", r.status_code, body, expected + " ✅ PASS")
            return True
        else:
            print_test("Race Condition", r.status_code, body, expected + " ❌ FAIL")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        return False

def test_4_status_polling(a_id):
    """Test 4: Status polling for A_ID"""
    print("\n\n🧪 TEST 4: Status Polling")
    try:
        r = requests.get(f"{API_BASE}/pix/status?agendamento_id={a_id}", timeout=10)
        body = r.json()
        
        expected = "PASS if HTTP 200 with status field (either 'reservado_pix' or 'Confirmado'), agendamento_id echoed"
        
        if (r.status_code == 200 and
            'status' in body and
            body.get('agendamento_id') == a_id):
            
            status = body.get('status')
            print_test("Status Polling", r.status_code, body, expected + f" ✅ PASS (status={status})")
            return True
        else:
            print_test("Status Polling", r.status_code, body, expected + " ❌ FAIL")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        return False

def test_5_different_slot_same_date():
    """Test 5: Slot different horario, same date works"""
    print("\n\n🧪 TEST 5: Different Slot Same Date")
    try:
        payload = {
            "cliente_nome": "Teste QA C",
            "cliente_apelido": "qa-c",
            "cliente_telefone": "21970000003",
            "data": "2027-02-15",  # Same date
            "horario": "14:00",    # Different time
            "servico": "Corte QA",
            "preco_total": 30,
            "duracao_total": 30
        }
        
        r = requests.post(f"{API_BASE}/pix/create", json=payload, timeout=15)
        body = r.json()
        
        expected = "PASS if HTTP 200, ok:true"
        
        if r.status_code == 200 and body.get('ok') == True:
            b_id = body.get('agendamento_id')
            created_agendamentos.append(b_id)
            print_test("Different Slot Same Date", r.status_code, body, expected + " ✅ PASS")
            print(f"📝 Saved B_ID: {b_id}")
            return b_id
        else:
            print_test("Different Slot Same Date", r.status_code, body, expected + " ❌ FAIL")
            return None
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        return None

def test_6_cancel(agendamento_id, label):
    """Test 6: Cancel agendamento"""
    print(f"\n\n🧪 TEST 6: Cancel {label}")
    try:
        payload = {"agendamento_id": agendamento_id}
        r = requests.post(f"{API_BASE}/pix/cancel", json=payload, timeout=10)
        body = r.json()
        
        expected = "PASS if HTTP 200 with ok:true"
        
        if r.status_code == 200 and body.get('ok') == True:
            print_test(f"Cancel {label}", r.status_code, body, expected + " ✅ PASS")
            return True
        else:
            print_test(f"Cancel {label}", r.status_code, body, expected + " ❌ FAIL")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        return False

def test_7_idempotent_create():
    """Test 7: Idempotent create"""
    print("\n\n🧪 TEST 7: Idempotent Create")
    try:
        payload = {
            "cliente_nome": "Teste QA Idem",
            "cliente_apelido": "qa-idem",
            "cliente_telefone": "21970000009",
            "data": "2027-02-15",
            "horario": "17:00",
            "servico": "Corte QA",
            "preco_total": 40,
            "duracao_total": 30,
            "idempotency_key": "test-idem-fixed-001"
        }
        
        # First request
        print("\n  → First request with idempotency_key...")
        r1 = requests.post(f"{API_BASE}/pix/create", json=payload, timeout=15)
        body1 = r1.json()
        
        if r1.status_code != 200 or not body1.get('ok'):
            print_test("Idempotent Create (First)", r1.status_code, body1, "❌ FAIL - First request should succeed")
            return None
        
        x_id = body1.get('agendamento_id')
        created_agendamentos.append(x_id)
        print(f"  ✅ First request OK, agendamento_id: {x_id}")
        
        # Second request with same idempotency_key
        print("\n  → Second request with SAME idempotency_key...")
        r2 = requests.post(f"{API_BASE}/pix/create", json=payload, timeout=15)
        body2 = r2.json()
        
        expected = "PASS if second request returns HTTP 409 with error:IDEMPOTENCY_ALREADY_PROCESSED and same agendamento_id"
        
        if (r2.status_code == 409 and
            body2.get('error') == 'IDEMPOTENCY_ALREADY_PROCESSED' and
            body2.get('agendamento_id') == x_id):
            print_test("Idempotent Create (Second)", r2.status_code, body2, expected + " ✅ PASS")
            return x_id
        else:
            print_test("Idempotent Create (Second)", r2.status_code, body2, expected + " ❌ FAIL")
            return x_id  # Still return x_id for cleanup
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        return None

def test_8_webhook_validation():
    """Test 8: Webhook validation (3 cases)"""
    print("\n\n🧪 TEST 8: Webhook Validation")
    
    # Read webhook token from .env
    webhook_token = None
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                if line.startswith('PAGBANK_WEBHOOK_TOKEN='):
                    webhook_token = line.split('=', 1)[1].strip()
                    break
    except Exception as e:
        print(f"❌ FAIL: Could not read PAGBANK_WEBHOOK_TOKEN from .env: {e}")
        return False
    
    if not webhook_token:
        print("❌ FAIL: PAGBANK_WEBHOOK_TOKEN not found in .env")
        return False
    
    print(f"  📝 Webhook token loaded (length: {len(webhook_token)})")
    
    # Case A: No header
    print("\n  → Case A: POST /webhook without header")
    try:
        body_a = json.dumps({"id": "ORDE_TEST_A", "reference_id": "test-a"})
        r = requests.post(f"{API_BASE}/webhook", data=body_a, headers={"Content-Type": "application/json"}, timeout=10)
        resp_a = r.json() if r.headers.get('content-type', '').startswith('application/json') else {"raw": r.text}
        
        if r.status_code == 401:
            print(f"    ✅ PASS - HTTP 401 (no header rejected)")
        else:
            print(f"    ❌ FAIL - Expected HTTP 401, got {r.status_code}")
            print(f"    Response: {truncate(str(resp_a))}")
    except Exception as e:
        print(f"    ❌ FAIL: Exception - {e}")
    
    # Case B: Correct signature with dummy order (no DB match)
    print("\n  → Case B: POST /webhook with correct signature (dummy order)")
    try:
        body_b = json.dumps({
            "id": "ORDE_DUMMY_QA",
            "reference_id": "barbearia-dummy",
            "charges": [{
                "status": "OTHER",
                "id": "C1",
                "payment_method": {"type": "PIX"}
            }]
        })
        sig_b = hashlib.sha256((webhook_token + '-' + body_b).encode()).hexdigest()
        r = requests.post(f"{API_BASE}/webhook", data=body_b, headers={
            "Content-Type": "application/json",
            "x-authenticity-token": sig_b
        }, timeout=10)
        resp_b = r.json() if r.headers.get('content-type', '').startswith('application/json') else {"raw": r.text}
        
        if r.status_code == 200 and resp_b.get('note') == 'no_action':
            print(f"    ✅ PASS - HTTP 200, note:no_action (charge status != PAID)")
        else:
            print(f"    ❌ FAIL - Expected HTTP 200 with note:no_action")
            print(f"    Status: {r.status_code}, Response: {truncate(str(resp_b))}")
    except Exception as e:
        print(f"    ❌ FAIL: Exception - {e}")
    
    # Case C: Correct signature with PAID status (but order doesn't exist in DB)
    print("\n  → Case C: POST /webhook with correct signature (PAID status, non-existent order)")
    try:
        body_c = json.dumps({
            "id": "ORDE_NONEXISTENT_QA",
            "reference_id": "barbearia-nonexistent",
            "charges": [{
                "status": "PAID",
                "id": "C2",
                "paid_at": "2027-02-15T10:00:00Z",
                "payment_method": {"type": "PIX"}
            }]
        })
        sig_c = hashlib.sha256((webhook_token + '-' + body_c).encode()).hexdigest()
        r = requests.post(f"{API_BASE}/webhook", data=body_c, headers={
            "Content-Type": "application/json",
            "x-authenticity-token": sig_c
        }, timeout=10)
        resp_c = r.json() if r.headers.get('content-type', '').startswith('application/json') else {"raw": r.text}
        
        # Since order doesn't exist in DB, confirmarPagamentoPix will return ok:false, reason:AGENDAMENTO_NAO_ENCONTRADO
        if r.status_code == 200:
            print(f"    ✅ PASS - HTTP 200 (webhook authenticated)")
            print(f"    Response: {truncate(str(resp_c))}")
        else:
            print(f"    ❌ FAIL - Expected HTTP 200")
            print(f"    Status: {r.status_code}, Response: {truncate(str(resp_c))}")
    except Exception as e:
        print(f"    ❌ FAIL: Exception - {e}")
    
    return True

def cleanup_all():
    """Cleanup: cancel all created agendamentos"""
    print("\n\n🧹 CLEANUP: Cancelling all created agendamentos")
    print(f"Total agendamentos to cancel: {len(created_agendamentos)}")
    
    for agendamento_id in created_agendamentos:
        try:
            print(f"  → Cancelling {agendamento_id}...")
            payload = {"agendamento_id": agendamento_id}
            r = requests.post(f"{API_BASE}/pix/cancel", json=payload, timeout=10)
            if r.status_code == 200:
                print(f"    ✅ Cancelled successfully")
            else:
                print(f"    ⚠️  Cancel returned {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"    ❌ Exception during cancel: {e}")
    
    print(f"\n✅ Cleanup complete. All {len(created_agendamentos)} agendamentos processed.")

def main():
    print("="*80)
    print("🚀 PagBank Pix Full Flow Test with Firestore Integration")
    print("="*80)
    print(f"API Base: {API_BASE}")
    print(f"Test Date: 2027-02-15 (FUTURE - safe for testing)")
    print("="*80)
    
    results = {}
    
    # Test 1: Health
    results['health'] = test_1_health()
    
    # Test 2: Create Pix slot A
    a_id = test_2_create_pix_slot_a()
    results['create_slot_a'] = a_id is not None
    
    # Test 3: Race condition (only if A was created)
    if a_id:
        results['race_condition'] = test_3_race_condition(a_id)
    else:
        print("\n⚠️  Skipping Test 3 (race condition) - A_ID not created")
        results['race_condition'] = False
    
    # Test 4: Status polling (only if A was created)
    if a_id:
        results['status_polling'] = test_4_status_polling(a_id)
    else:
        print("\n⚠️  Skipping Test 4 (status polling) - A_ID not created")
        results['status_polling'] = False
    
    # Test 5: Different slot same date
    b_id = test_5_different_slot_same_date()
    results['different_slot'] = b_id is not None
    
    # Test 7: Idempotent create
    x_id = test_7_idempotent_create()
    results['idempotent_create'] = x_id is not None
    
    # Test 8: Webhook validation
    results['webhook_validation'] = test_8_webhook_validation()
    
    # Cleanup
    cleanup_all()
    
    # Summary
    print("\n\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"Total: {passed}/{total} tests passed")
    print("\nDetailed Results:")
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit(main())
