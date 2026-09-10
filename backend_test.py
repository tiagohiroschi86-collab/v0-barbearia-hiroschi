#!/usr/bin/env python3
"""
PagBank Webhook Signature Validation Test
Tests the /api/pagbank/* routes in isolation (no Firestore, no live PagBank calls)
"""

import requests
import hashlib
import json
import os
import sys

# Read the webhook token from .env
def read_env_token():
    """Read PAGBANK_WEBHOOK_TOKEN from /app/.env"""
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                if line.startswith('PAGBANK_WEBHOOK_TOKEN='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"❌ Failed to read .env: {e}")
        sys.exit(1)
    print("❌ PAGBANK_WEBHOOK_TOKEN not found in .env")
    sys.exit(1)

TOKEN = read_env_token()
BASE_URL = "http://localhost:3000"

print("=" * 80)
print("PagBank Webhook Signature Validation Test")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"Token (first 12 chars): {TOKEN[:12]}...")
print("=" * 80)
print()

# Test results tracking
test_results = []

def compute_signature(raw_body_str):
    """Compute SHA-256 signature as per PagBank spec: sha256(token + '-' + rawBody)"""
    message = TOKEN + '-' + raw_body_str
    return hashlib.sha256(message.encode('utf-8')).hexdigest()

def test_scenario(name, method, endpoint, headers=None, body=None, expected_status=None, expected_fields=None):
    """Run a test scenario and report results"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print(f"{'='*80}")
    
    url = f"{BASE_URL}{endpoint}"
    print(f"Request: {method} {url}")
    
    if headers:
        print(f"Headers: {headers}")
    if body:
        print(f"Body: {body[:200]}..." if len(body) > 200 else f"Body: {body}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, data=body, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        # Check expected status
        status_match = response.status_code == expected_status if expected_status else True
        
        # Check expected fields
        fields_match = True
        if expected_fields:
            try:
                response_json = response.json()
                for field, expected_value in expected_fields.items():
                    actual_value = response_json.get(field)
                    if actual_value != expected_value:
                        print(f"❌ Field mismatch: {field} = {actual_value}, expected {expected_value}")
                        fields_match = False
            except Exception as e:
                print(f"❌ Failed to parse response JSON: {e}")
                fields_match = False
        
        # Overall result
        passed = status_match and fields_match
        result = "✅ PASS" if passed else "❌ FAIL"
        
        print(f"\n{result}")
        if expected_status:
            print(f"  Expected status: {expected_status}, Got: {response.status_code} {'✓' if status_match else '✗'}")
        if expected_fields:
            print(f"  Expected fields: {expected_fields} {'✓' if fields_match else '✗'}")
        
        test_results.append({
            'name': name,
            'passed': passed,
            'status': response.status_code,
            'body': response.text
        })
        
        return response
        
    except Exception as e:
        print(f"\n❌ FAIL - Exception: {e}")
        test_results.append({
            'name': name,
            'passed': False,
            'error': str(e)
        })
        return None

# ============================================================================
# SCENARIO 1: Health Check
# ============================================================================
test_scenario(
    name="1. Health Check",
    method="GET",
    endpoint="/api/pagbank/health",
    expected_status=200,
    expected_fields={
        'ok': True,
        'env_ready': True,
        'token_set': True,
        'base_url_set': True
    }
)

# ============================================================================
# SCENARIO 2: Webhook without signature header
# ============================================================================
body_2 = json.dumps({"test": "no_signature"})
test_scenario(
    name="2. Webhook without signature header",
    method="POST",
    endpoint="/api/pagbank/webhook",
    headers={'Content-Type': 'application/json'},
    body=body_2,
    expected_status=401,
    expected_fields={'error': 'invalid_signature'}
)

# ============================================================================
# SCENARIO 3: Webhook with garbage signature
# ============================================================================
body_3 = json.dumps({"test": "garbage_signature"})
garbage_sig = "a" * 64  # 64-char hex garbage
test_scenario(
    name="3. Webhook with garbage signature",
    method="POST",
    endpoint="/api/pagbank/webhook",
    headers={
        'Content-Type': 'application/json',
        'x-authenticity-token': garbage_sig
    },
    body=body_3,
    expected_status=401,
    expected_fields={'error': 'invalid_signature'}
)

# ============================================================================
# SCENARIO 4: Webhook with correct signature
# ============================================================================
body_4_dict = {
    "id": "ORDE_TESTE_AGENT_1",
    "reference_id": "barbearia-agend-XYZ",
    "status": "PAID",
    "charges": [
        {
            "id": "CHAR_1",
            "status": "PAID",
            "amount": {"value": 100},
            "payment_method": {"type": "PIX"}
        }
    ]
}
# CRITICAL: Use the exact same serialized string for both signature and POST
body_4_str = json.dumps(body_4_dict, separators=(',', ':'))
signature_4 = compute_signature(body_4_str)

print(f"\n[DEBUG] Body for scenario 4: {body_4_str}")
print(f"[DEBUG] Computed signature: {signature_4}")

test_scenario(
    name="4. Webhook with correct signature",
    method="POST",
    endpoint="/api/pagbank/webhook",
    headers={
        'Content-Type': 'application/json',
        'x-authenticity-token': signature_4
    },
    body=body_4_str,
    expected_status=200,
    expected_fields={
        'received': True,
        'authenticated': True,
        'order_id': 'ORDE_TESTE_AGENT_1',
        'reference_id': 'barbearia-agend-XYZ',
        'charge_status': 'PAID'
    }
)

# ============================================================================
# SCENARIO 5: Replay/tampering protection
# ============================================================================
# Use the signature from scenario 4 but send a DIFFERENT body
body_5_dict = {
    "id": "ORDE_TESTE_AGENT_1",
    "reference_id": "barbearia-agend-XYZ",
    "status": "CANCELLED",  # Changed from PAID to CANCELLED
    "charges": [
        {
            "id": "CHAR_1",
            "status": "CANCELLED",  # Changed
            "amount": {"value": 100},
            "payment_method": {"type": "PIX"}
        }
    ]
}
body_5_str = json.dumps(body_5_dict, separators=(',', ':'))

print(f"\n[DEBUG] Body for scenario 5 (tampered): {body_5_str}")
print(f"[DEBUG] Using signature from scenario 4 (should fail): {signature_4}")

test_scenario(
    name="5. Replay/tampering protection",
    method="POST",
    endpoint="/api/pagbank/webhook",
    headers={
        'Content-Type': 'application/json',
        'x-authenticity-token': signature_4  # Using old signature with new body
    },
    body=body_5_str,
    expected_status=401,
    expected_fields={'error': 'invalid_signature'}
)

# ============================================================================
# Check webhook log file
# ============================================================================
print("\n" + "=" * 80)
print("WEBHOOK LOG FILE (/tmp/pagbank_webhook_hits.log - last 10 lines)")
print("=" * 80)
try:
    with open('/tmp/pagbank_webhook_hits.log', 'r') as f:
        lines = f.readlines()
        last_10 = lines[-10:] if len(lines) >= 10 else lines
        for line in last_10:
            print(line.rstrip())
except FileNotFoundError:
    print("❌ Log file not found")
except Exception as e:
    print(f"❌ Error reading log file: {e}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

passed_count = sum(1 for r in test_results if r.get('passed', False))
total_count = len(test_results)

for i, result in enumerate(test_results, 1):
    status = "✅ PASS" if result.get('passed', False) else "❌ FAIL"
    print(f"{i}. {result['name']}: {status}")
    if 'status' in result:
        print(f"   Status: {result['status']}")
    if 'error' in result:
        print(f"   Error: {result['error']}")

print(f"\nTotal: {passed_count}/{total_count} tests passed")

if passed_count == total_count:
    print("\n🎉 ALL TESTS PASSED!")
    sys.exit(0)
else:
    print(f"\n⚠️  {total_count - passed_count} test(s) failed")
    sys.exit(1)
