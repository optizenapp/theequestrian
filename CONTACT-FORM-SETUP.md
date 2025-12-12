# Contact Form Setup Guide

## 🎯 Overview

A fully functional contact form with Resend API integration has been created. The form includes:

- ✅ Beautiful, responsive design
- ✅ Form validation
- ✅ Email delivery via Resend API
- ✅ Professional HTML email template
- ✅ Success/error states
- ✅ Loading indicators

---

## 📋 Setup Steps

### 1. Get Your Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up or log in
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Copy your API key (starts with `re_`)

### 2. Verify Your Domain (Important!)

**For production emails, you MUST verify your domain:**

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `theequestrian.com.au`
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-30 minutes)

**Until verified, you can only send to:**
- Your own email address
- Test addresses you add in Resend

### 3. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Configuration
RESEND_API_KEY=re_your_api_key_here

# Email Configuration
RESEND_FROM_EMAIL=noreply@theequestrian.com.au
CONTACT_EMAIL=hello@theequestrian.com.au
```

**Important:**
- `RESEND_FROM_EMAIL` - Must be from your verified domain
- `CONTACT_EMAIL` - Where contact form submissions go

### 4. Add to Vercel Environment Variables

For production:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the same variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `CONTACT_EMAIL`
4. Click **Save**
5. Redeploy your site

---

## 🎨 What Was Created

### 1. API Route: `/app/api/contact/route.ts`

**Features:**
- ✅ Validates form data
- ✅ Sends email via Resend
- ✅ Beautiful HTML email template
- ✅ Error handling
- ✅ Reply-to set to customer's email

### 2. Contact Form Component: `/components/contact/ContactForm.tsx`

**Features:**
- ✅ Name, Email, Phone, Subject, Message fields
- ✅ Form validation
- ✅ Loading states
- ✅ Success/error messages
- ✅ Responsive design
- ✅ Accessible (WCAG compliant)

### 3. Contact Page: `/app/contact/page.tsx`

**Features:**
- ✅ Hero section
- ✅ Contact information cards (email, phone, hours)
- ✅ Embedded contact form
- ✅ FAQ link
- ✅ SEO optimized

---

## 📧 Email Template

The email sent to you includes:

```
┌─────────────────────────────────────┐
│  New Contact Form Submission        │
│  The Equestrian                     │
├─────────────────────────────────────┤
│  Name: John Smith                   │
│  Email: john@example.com            │
│  Phone: +61 400 000 000            │
│  Subject: Product Question          │
│  Message: [Customer's message]      │
└─────────────────────────────────────┘
```

**Features:**
- Professional design with your brand colors
- Clickable email and phone links
- Reply-to automatically set to customer
- Mobile-friendly

---

## 🚀 Usage

### Access the Contact Form

**Local:**
```
http://localhost:3001/contact
```

**Production:**
```
https://theequestrian.com.au/contact
```

### Test the Form

1. Fill out all required fields (Name, Email, Message)
2. Optionally add Phone and Subject
3. Click "Send Message"
4. You'll see a success message
5. Check your email inbox

---

## 🎯 Customization

### Change Email Template

Edit `/app/api/contact/route.ts`:

```typescript
html: `
  <!DOCTYPE html>
  <html>
    <!-- Your custom HTML here -->
  </html>
`
```

### Change Form Fields

Edit `/components/contact/ContactForm.tsx`:

```typescript
// Add new field to state
const [formData, setFormData] = useState({
  // ... existing fields
  newField: '',
});

// Add new input in JSX
<input
  name="newField"
  value={formData.newField}
  onChange={handleChange}
/>
```

### Change Contact Info

Edit `/app/contact/page.tsx`:

```typescript
// Update email, phone, hours in the contact info cards
<a href="mailto:your@email.com">
  your@email.com
</a>
```

### Change Subject Options

Edit `/components/contact/ContactForm.tsx`:

```typescript
<select name="subject">
  <option value="Your Custom Subject">Your Custom Subject</option>
  {/* Add more options */}
</select>
```

---

## 🔧 Troubleshooting

### Email Not Sending

**Problem:** Form submits but no email arrives

**Solutions:**
1. Check Resend API key is correct in `.env.local`
2. Verify your domain in Resend dashboard
3. Check `RESEND_FROM_EMAIL` is from verified domain
4. Look at Resend dashboard → **Logs** for errors
5. Check browser console for errors

### "Failed to send email" Error

**Problem:** Error message appears after submission

**Solutions:**
1. Check Resend API key is valid
2. Ensure environment variables are set
3. Check Resend dashboard for API errors
4. Verify domain is verified (for production)

### Email Goes to Spam

**Problem:** Emails arrive in spam folder

**Solutions:**
1. Verify your domain in Resend
2. Add SPF and DKIM records (provided by Resend)
3. Use a professional "from" address (not gmail.com)
4. Avoid spam trigger words in subject

### Form Not Appearing

**Problem:** Contact page loads but form is missing

**Solutions:**
1. Check browser console for errors
2. Ensure `ContactForm` component is imported
3. Check for CSS conflicts
4. Clear browser cache

---

## 📊 Resend Dashboard

Monitor your contact form submissions:

1. Go to [resend.com/emails](https://resend.com/emails)
2. See all sent emails
3. Check delivery status
4. View open rates (if tracking enabled)
5. Debug failed sends

---

## 🛡️ Security Features

✅ **Rate Limiting** - Consider adding rate limiting to prevent spam
✅ **Email Validation** - Built-in email format validation
✅ **Required Fields** - Name, email, message are required
✅ **XSS Protection** - HTML is escaped in email template
✅ **CORS** - API route only accepts POST requests

### Optional: Add Rate Limiting

Install rate limiting package:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Add to API route:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"), // 5 requests per hour
});

// In POST handler:
const identifier = request.headers.get("x-forwarded-for") || "anonymous";
const { success } = await ratelimit.limit(identifier);

if (!success) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429 }
  );
}
```

---

## 🎨 Design Customization

### Change Colors

The form uses Tailwind's `action` color. Update in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      action: '#your-color',
      'action-hover': '#your-hover-color',
    }
  }
}
```

### Change Layout

The form is centered with `max-w-2xl`. To make it wider:

```typescript
// In ContactForm.tsx
<div className="max-w-4xl mx-auto"> {/* Changed from max-w-2xl */}
```

### Add Background Pattern

```typescript
// In page.tsx
<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
  {/* Add pattern */}
  <div className="absolute inset-0 bg-grid-pattern opacity-5" />
  {/* Rest of content */}
</div>
```

---

## ✅ Checklist

Before going live:

- [ ] Resend API key added to `.env.local`
- [ ] Domain verified in Resend
- [ ] Environment variables added to Vercel
- [ ] Test form submission locally
- [ ] Test form submission in production
- [ ] Check email arrives in inbox (not spam)
- [ ] Update contact email address
- [ ] Update phone number
- [ ] Update business hours
- [ ] Test on mobile devices
- [ ] Test with screen reader (accessibility)

---

## 📞 Support

**Resend Documentation:** [resend.com/docs](https://resend.com/docs)

**Need Help?**
- Check Resend dashboard logs
- Review browser console errors
- Test API route directly: `POST /api/contact`

---

## 🚀 Next Steps

1. **Add to Navigation** - Link to `/contact` in your header/footer
2. **Add Captcha** - Consider adding reCAPTCHA for spam protection
3. **Add Analytics** - Track form submissions
4. **Add Auto-Reply** - Send confirmation email to customer
5. **Add CRM Integration** - Connect to HubSpot, Salesforce, etc.

---

Your contact form is ready to use! Just add your Resend API key and you're good to go. 🎉


