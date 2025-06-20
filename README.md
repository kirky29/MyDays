# My Days - Employee Work Tracker

A mobile-first web application for tracking employee work days and payments with real-time synchronization across multiple devices. Built with Next.js, React, Tailwind CSS, and Firebase Firestore.

## Features

- ✅ Add and manage employees with daily wage rates
- ✅ Track work days for each employee
- ✅ Mark payments for worked days
- ✅ Calculate total earnings and outstanding payments
- ✅ **Real-time synchronization across multiple devices**
- ✅ **Cloud storage with Firebase Firestore**
- ✅ Mobile-first responsive design
- ✅ Clean, intuitive interface
- ✅ Sync status indicators
- ✅ Offline capability with sync when online

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Date Handling**: date-fns
- **Database**: Firebase Firestore
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (already configured)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd my-days-app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Adding Employees
1. Enter the employee's name
2. Enter their daily wage rate
3. Click "Add Employee" (data syncs to cloud automatically)

### Tracking Work Days
1. Select a date using the date picker
2. For each employee, click "Mark Worked" if they worked that day
3. Click "Mark Paid" when payment is made for that work day
4. Changes sync instantly across all devices

### Multi-Device Sync
- **Real-time updates**: Changes made on one device appear instantly on others
- **Sync status indicator**: Shows when data is syncing, synced, or has errors
- **Cloud storage**: All data is stored securely in Firebase Firestore
- **Offline support**: App works offline and syncs when connection is restored

### Viewing Summary
- See total earnings, payments, and outstanding amounts for each employee
- View overall summary statistics
- All calculations update in real-time

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up/login
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's a Next.js project
6. Click "Deploy"

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Project Structure

```
my-days-app/
├── app/
│   ├── globals.css          # Global styles and Tailwind imports
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main application page
├── lib/
│   └── firebase.ts          # Firebase configuration and service functions
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel deployment configuration
└── README.md               # This file
```

## Data Storage & Sync

The application uses **Firebase Firestore** for data persistence and synchronization:

- **Cloud Storage**: All data is stored securely in Firebase Firestore
- **Real-time Sync**: Changes sync instantly across all devices
- **Offline Support**: App works offline and syncs when connection is restored
- **Automatic Backups**: Data is automatically backed up in the cloud
- **Multi-user Support**: Multiple users can access the same data simultaneously

### Firebase Collections

- `employees`: Stores employee information (name, daily wage)
- `workDays`: Stores work day records (employee, date, worked status, paid status)

## Security

- Firebase security rules protect your data
- API keys are configured for your specific Firebase project
- Data is stored securely in Google's cloud infrastructure

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions, please open an issue on GitHub. 