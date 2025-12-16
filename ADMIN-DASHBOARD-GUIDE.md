# Admin Dashboard Guide

## 🎛️ Review Management Dashboard

A simple, powerful admin interface for managing customer reviews.

---

## 🔐 Access

**URL:** `https://theequestrian.com.au/admin/reviews`

**Login:** `https://theequestrian.com.au/admin/login`

---

## 🔑 Setup

### 1. Set Admin Password

Add to your `.env.local` and Vercel Environment Variables:

```bash
ADMIN_PASSWORD=your_secure_password_here
```

**Important:** Use a strong password! This protects your review moderation system.

### 2. Deploy

The admin dashboard is automatically protected by middleware. Only users with the correct password can access it.

---

## ✨ Features

### **Dashboard Stats**
- 📊 Total reviews count
- ⏳ Pending reviews (awaiting moderation)
- ✅ Approved reviews (live on site)
- ❌ Rejected reviews
- ⭐ Average rating across all approved reviews

### **Review Management**
- **View all reviews** in a clean table layout
- **Filter by status:** All, Pending, Approved, Rejected
- **Search reviews** by product name, customer name, or review content
- **Quick actions:**
  - ✓ Approve - Publish review to site
  - ✗ Reject - Hide review from site
  - 🗑️ Delete - Permanently remove review

### **Review Details**
Each review shows:
- Product name
- Customer name
- Verified purchase badge (if from order)
- Star rating (1-5 stars)
- Review title and content
- Status (pending/approved/rejected)
- Submission date

---

## 🚀 How to Use

### **Login**
1. Go to `/admin/login`
2. Enter your admin password
3. You'll be redirected to the dashboard

### **Approve a Review**
1. Find the review in the table
2. Click the **✓** (checkmark) button
3. Review instantly goes live on the product page

### **Reject a Review**
1. Find the review in the table
2. Click the **✗** (X) button
3. Review is hidden from customers

### **Delete a Review**
1. Find the review in the table
2. Click the **🗑️** (trash) button
3. Confirm deletion
4. Review is permanently removed from database

### **Search Reviews**
- Use the search box to find reviews by:
  - Product name
  - Customer name
  - Review content

### **Filter by Status**
- Click **All** to see all reviews
- Click **Pending** to see reviews awaiting moderation
- Click **Approved** to see published reviews
- Click **Rejected** to see hidden reviews

---

## 📧 Workflow

### **Typical Review Flow:**

1. **Customer submits review** on product page
2. **Review saved as "pending"** in database
3. **You receive email notification** with review details
4. **You log into admin dashboard**
5. **Review the submission:**
   - Is it genuine?
   - Is it appropriate?
   - Does it follow guidelines?
6. **Approve or Reject:**
   - ✓ Approve → Review goes live
   - ✗ Reject → Review stays hidden
7. **Customer sees their review** on product page (if approved)

---

## 🔒 Security

### **Authentication**
- Password-protected login
- Session expires after 7 days
- Secure HTTP-only cookies
- Automatic redirect to login if not authenticated

### **Authorization**
- All `/admin/*` routes are protected
- Middleware checks authentication on every request
- API routes require valid session

### **Best Practices**
- Use a strong, unique password
- Don't share admin credentials
- Log out when finished
- Change password regularly

---

## 🎨 Design

- **Clean, modern interface**
- **Responsive design** (works on mobile, tablet, desktop)
- **Color-coded status badges:**
  - 🟡 Yellow = Pending
  - 🟢 Green = Approved
  - 🔴 Red = Rejected
- **Hover effects** for better UX
- **Fast, real-time updates**

---

## 🛠️ Technical Details

### **Files Created:**
- `middleware.ts` - Route protection
- `app/api/admin/auth/route.ts` - Login/logout API
- `app/api/admin/reviews/route.ts` - Fetch reviews with filters
- `app/api/admin/reviews/[id]/route.ts` - Update/delete reviews
- `app/admin/login/page.tsx` - Login page
- `app/admin/reviews/page.tsx` - Main dashboard

### **Database Queries:**
- **GET /api/admin/reviews** - Fetch all reviews with optional filters
- **PATCH /api/admin/reviews/[id]** - Update review status or content
- **DELETE /api/admin/reviews/[id]** - Delete review

### **Authentication:**
- Cookie-based sessions
- 7-day expiration
- Secure flag in production
- HTTP-only (JavaScript can't access)

---

## 📝 Future Enhancements

Potential features to add later:

- **Bulk actions** (approve/reject multiple reviews at once)
- **Edit review content** (fix typos, moderate language)
- **Reply to reviews** (admin responses)
- **Email notifications** for specific events
- **Audit log** (track who approved/rejected what)
- **Multi-user support** (different admin accounts)
- **Role-based access** (admin vs moderator)
- **Review analytics** (charts, trends, insights)

---

## 🐛 Troubleshooting

**Can't log in:**
- Check `ADMIN_PASSWORD` is set in environment variables
- Try clearing browser cookies
- Check Vercel logs for errors

**Reviews not updating:**
- Check database connection
- Verify Neon Postgres is running
- Check browser console for errors

**Middleware redirect loop:**
- Clear cookies
- Check middleware.ts configuration
- Verify cookie settings

---

## 📞 Support

If you need help:
1. Check this guide
2. Check Vercel logs
3. Check browser console
4. Review the code comments

---

**The admin dashboard is ready to use!** 🎉

Log in at `/admin/login` and start moderating reviews.



