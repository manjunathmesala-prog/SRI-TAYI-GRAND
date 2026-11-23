const Razorpay = require('razorpay');

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_U3aO08c0MEmri7',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'tsYd09xbAxvYpjEp8B3Tnv9z',
});

async function main() {
  try {
    const res = await rzp.payments.all({ count: 10 });
    console.log('Total payments found:', res.items.length);
    res.items.forEach(p => {
      console.log(`Payment: ${p.id} | Amount: Rs.${p.amount / 100} | Status: ${p.status} | Method: ${p.method} | Created: ${new Date(p.created_at * 1000).toISOString()}`);
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
  }
}

main();
