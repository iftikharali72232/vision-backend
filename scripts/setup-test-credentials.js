/**
 * Setup Test Credentials
 * Creates Ethereal email test account and shows Stripe test info
 * Run: node scripts/setup-test-credentials.js
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n🔧 Setting up test credentials...\n');

  // ── 1. Create Ethereal test email account ──
  console.log('📧 Creating Ethereal email test account...');
  let testAccount;
  try {
    testAccount = await nodemailer.createTestAccount();
    console.log('✅ Ethereal account created:');
    console.log(`   SMTP_HOST=smtp.ethereal.email`);
    console.log(`   SMTP_PORT=587`);
    console.log(`   SMTP_USER=${testAccount.user}`);
    console.log(`   SMTP_PASS=${testAccount.pass}`);
    console.log(`   📬 View sent emails: https://ethereal.email/login`);
    console.log(`      Login: ${testAccount.user} / ${testAccount.pass}`);
  } catch (err) {
    console.error('❌ Failed to create Ethereal account:', err.message);
    console.log('   You can create one manually at: https://ethereal.email/create');
  }

  // ── 2. Update .env file ──
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath) && testAccount) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update SMTP settings
    envContent = envContent.replace(/SMTP_HOST=.*/, `SMTP_HOST=smtp.ethereal.email`);
    envContent = envContent.replace(/SMTP_PORT=.*/, `SMTP_PORT=587`);
    envContent = envContent.replace(/SMTP_USER=.*/, `SMTP_USER=${testAccount.user}`);
    envContent = envContent.replace(/SMTP_PASS=.*/, `SMTP_PASS=${testAccount.pass}`);
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file updated with Ethereal credentials');
  }

  // ── 3. Stripe test info ──
  console.log('\n💳 Stripe Test Mode Setup:');
  console.log('──────────────────────────────────────────');
  console.log('1. Go to: https://dashboard.stripe.com/test/apikeys');
  console.log('2. Copy the "Secret key" (starts with sk_test_)');
  console.log('3. Update .env: STRIPE_SECRET_KEY=sk_test_...');
  console.log('');
  console.log('For webhook testing:');
  console.log('4. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
  console.log('5. Run: stripe listen --forward-to localhost:8000/api/subscription/webhook');
  console.log('6. Copy the webhook signing secret and update .env:');
  console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('');
  console.log('Test card numbers:');
  console.log('   ✅ Success:  4242 4242 4242 4242');
  console.log('   ❌ Decline:  4000 0000 0000 0002');
  console.log('   ⚠️  3D Secure: 4000 0025 0000 3155');
  console.log('   Use any future expiry date, any 3-digit CVC');
  console.log('');

  // ── 4. Test email sending ──
  if (testAccount) {
    console.log('📧 Sending test email...');
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await transporter.sendMail({
        from: '"Vision POS" <noreply@visionpos.com>',
        to: testAccount.user,
        subject: 'Test Email - Vision POS Setup',
        html: `
          <h2>✅ Email Setup Working!</h2>
          <p>This is a test email from Vision POS.</p>
          <p>Your Ethereal credentials are working correctly.</p>
          <p>View this email at: <a href="https://ethereal.email/messages">Ethereal Messages</a></p>
        `,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('✅ Test email sent!');
      console.log(`   Preview: ${previewUrl}`);
    } catch (err) {
      console.error('❌ Failed to send test email:', err.message);
    }
  }

  console.log('\n✅ Setup complete!\n');
}

main().catch(console.error);
