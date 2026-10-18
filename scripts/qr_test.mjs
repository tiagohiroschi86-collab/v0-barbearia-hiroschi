import fs from 'node:fs'
import crypto from 'node:crypto'
const env = Object.fromEntries(fs.readFileSync('/app/.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const r = await fetch(`${env.PAGBANK_BASE_URL}/orders`, {
  method: 'POST',
  headers: { 'Content-Type':'application/json', Authorization: `Bearer ${env.PAGBANK_ACCESS_TOKEN}`, 'x-idempotency-key': crypto.randomUUID() },
  body: JSON.stringify({
    reference_id: 'qr-test-'+Date.now(),
    customer:{name:'Teste QR',email:'t@t.com',tax_id:'12345678909',phones:[{country:'55',area:'21',number:'979012977',type:'MOBILE'}]},
    items:[{reference_id:'x',name:'Clube Bronze',quantity:1,unit_amount:5000}],
    qr_codes:[{amount:{value:5000},expiration_date:new Date(Date.now()+10*60*1000).toISOString().replace(/\.\d{3}Z$/,'-03:00')}],
    notification_urls:[env.APP_BASE_URL+'/api/pagbank/webhook'],
  })
})
const j = await r.json()
console.log('qr.id =', j.qr_codes[0].id)
console.log('qr.links =', JSON.stringify(j.qr_codes[0].links, null, 2))
console.log('qr.text[0..60] =', j.qr_codes[0].text.slice(0,60))

// Testa fetch do PNG (sem auth)
const png = j.qr_codes[0].links.find(l => l.media === 'image/png' || l.rel === 'QRCODE.PNG')?.href
console.log('\nPNG URL = ', png)
if (png) {
  const r2 = await fetch(png)
  console.log('PNG fetch status =', r2.status, 'content-type =', r2.headers.get('content-type'), 'len =', (await r2.arrayBuffer()).byteLength)
}
