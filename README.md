# My Days - Employee Work Tracker

A mobile-first web application for tracking employee work days and payments. Built with Next.js, React, and Tailwind CSS.

## Features

- ✅ Add and manage employees with daily wage rates
- ✅ Track work days for each employee
- ✅ Mark payments for worked days
- ✅ Calculate total earnings and outstanding payments
- ✅ Mobile-first responsive design
- ✅ Local storage for data persistence
- ✅ Clean, intuitive interface

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Date Handling**: date-fns
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

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
3. Click "Add Employee"

### Tracking Work Days
1. Select a date using the date picker
2. For each employee, click "Mark Worked" if they worked that day
3. Click "Mark Paid" when payment is made for that work day

### Viewing Summary
- See total earnings, payments, and outstanding amounts for each employee
- View overall summary statistics

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
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Data Storage

The application uses browser localStorage to persist data. This means:
- Data is stored locally in the user's browser
- Data persists between sessions
- No server or database required
- Data is private to each device/browser

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