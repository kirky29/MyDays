# My Days - Enhanced Work Tracker 🚀

A comprehensive, mobile-friendly work tracking and payroll management app built with Next.js, Firebase, and Tailwind CSS.

## 🌟 New Features & Enhancements

### 📋 **Enhanced Employee Management**
- **Auto-redirect to Profile**: When you add a new employee, you're automatically taken to their profile for immediate setup
- **Detailed Employee Profiles**: Add contact information, start dates, and notes
- **Employee Search**: Quickly find employees with real-time search functionality
- **Edit Employee Details**: Update employee information anytime

### 📅 **Advanced Work Day Management**
- **Quick Add Work Days**: Single-click work day addition from any date
- **Visual Status Indicators**: 
  - Gray = Not worked
  - Blue = Worked (unpaid)
  - Green = Worked & Paid

### 💰 **Robust Financial Tracking**
- **Detailed Financial Summaries**: Complete earning and payment breakdowns
- **Bulk Payment Processing**: Select multiple work days for batch payments
- **Payment History**: Full audit trail of all payments
- **Outstanding Balance Tracking**: Real-time calculation of amounts owed

### 📊 **Comprehensive Reporting System**
- **Multiple Report Types**:
  - Summary Reports: Overview of work and payments by employee
  - Detailed Reports: Day-by-day breakdown
  - Payment Reports: Payment history analysis
- **Date Range Filtering**: Generate reports for any time period
- **Employee Selection**: Include/exclude specific employees
- **CSV Export**: Download reports for external analysis
- **Real-time Preview**: See report data before exporting

### 🎨 **Improved User Experience**
- **Mobile-First Design**: Optimized for phone usage
- **Real-time Sync Status**: Visual indicators for data synchronization
- **Error Handling**: Comprehensive error messages and retry options
- **Responsive Interface**: Works seamlessly on all device sizes

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Firebase project with Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-days
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Update `lib/firebase.ts` with your Firebase configuration
   - Ensure Firestore security rules allow read/write access

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 📱 Core Features

### Employee Management
- ➕ **Add Employees**: Name, daily wage, contact details, start date, notes
- ✏️ **Edit Details**: Update employee information anytime
- 🔍 **Search**: Find employees quickly with real-time search
- 🗑️ **Delete**: Remove employees and all associated data

### Work Day Tracking
- 📅 **Daily Tracking**: Mark work days as worked/not worked
- 💳 **Payment Status**: Track payment status for each work day
- ⚡ **Quick Add**: Add work days with single date picker

### Payment Management
- 💰 **Bulk Payments**: Process multiple work days at once
- 🏦 **Payment Types**: Bank Transfer, PayPal, Cash, Other
- 📝 **Payment Notes**: Add notes to payment records
- 📋 **Payment History**: Complete audit trail

### Reporting & Analytics
- 📈 **Summary Reports**: Employee performance overview
- 📋 **Detailed Reports**: Day-by-day work breakdown
- 💸 **Payment Reports**: Payment history analysis
- 📊 **CSV Export**: Download data for external analysis
- 🎯 **Filtering Options**: Date ranges and employee selection

## 🛠️ Technical Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Date Handling**: date-fns
- **Deployment**: Vercel

## 📖 User Guide

### Adding Your First Employee

1. Click **"Add Employee & Set Up Profile"**
2. Enter name and daily wage
3. You'll be automatically redirected to their profile
4. Add additional details like email, phone, and notes
5. Start tracking work days immediately

### Tracking Work Days

**Method 1: Quick Work Day Tracker (Main Page)**
- Select date
- Click "Mark Worked" for each employee

**Method 2: Employee Profile**
- Use "Quick Add Work Day" section

### Processing Payments

1. **Navigate to Employee Profile**
2. **Select Work Days**: 
   - Manually check work days
   - Or click "Select All Unpaid"
3. **Click "Process Payment"** 
4. **Choose Payment Method** and add notes
5. **Confirm Payment** - work days are automatically marked as paid

### Generating Reports

1. **Click "Reports"** button on main page
2. **Set Date Range**: Choose start and end dates
3. **Select Report Type**:
   - Summary: Employee overview
   - Detailed: Day-by-day breakdown  
   - Payments: Payment history only
4. **Choose Employees**: Select specific employees or leave empty for all
5. **Preview Report**: Review data before export
6. **Export to CSV**: Download for spreadsheet analysis

## 🎨 Design Features

- **Mobile-First**: Optimized for smartphone usage
- **Color-Coded Status**: Instantly understand work and payment status
- **Real-time Updates**: Changes sync immediately across all views
- **Intuitive Navigation**: Logical flow between screens
- **Visual Feedback**: Loading states and success/error messages
- **Touch-Friendly**: Large buttons and touch targets

## 🔧 Configuration

### Firebase Setup
```javascript
// lib/firebase.ts
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}
```

### Firestore Collections
- **employees**: Employee data and details
- **workDays**: Daily work records
- **payments**: Payment transaction history

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms
The app can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- AWS Amplify
- Digital Ocean

## 🆘 Troubleshooting

### Common Issues

**App shows "Loading..." indefinitely**
- Check Firebase configuration
- Verify Firestore security rules
- Check browser console for errors

**Data not syncing**
- Check internet connection
- Look for sync status indicator (top of screen)
- Try "Retry Connection" button

**CSV export not working**
- Ensure pop-up blocker is disabled
- Try different browser
- Check file download permissions

## 🔮 Planned Features

- **Time Tracking**: Hours worked instead of just daily presence
- **Multiple Projects**: Track work across different jobs
- **Photo Upload**: Employee profile pictures
- **Backup/Restore**: Data export/import functionality  
- **Notifications**: Payment reminders and alerts
- **Advanced Reporting**: Charts and graphs
- **Multi-user Support**: Multiple managers/admins

## 📞 Support

For issues or feature requests, please create an issue in the repository or contact the development team.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for efficient work tracking and payroll management**  
*Latest update: Enhanced calendar functionality* 