# 🎨 DeenBot Frontend (React + TypeScript)

This is the frontend application for DeenBot, built with React, TypeScript, and Vite.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**
```bash
npm install
# or
yarn install
```

2. **Start development server**
```bash
npm run dev
# or
yarn dev
```

3. **Access the application**
- Frontend: http://localhost:5173
- Make sure the backend is running on http://localhost:8006

## 🏗️ Architecture

### Tech Stack
- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── chat/           # Chat-related components
│   ├── media/          # Media processing components
│   └── layout/         # Layout components
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Authentication state
│   ├── ChatContext.tsx # Chat state management
│   └── ThemeContext.tsx # Theme management
├── pages/              # Page components
│   ├── ChatPage.tsx    # Main chat interface
│   ├── LoginPage.tsx   # Authentication
│   └── HomePage.tsx    # Landing page
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
└── styles/             # Global styles
```

## 🎯 Key Features

### Chat Interface
- Real-time messaging
- Message history
- Conversation management
- Multi-language support

### Media Processing
- Audio file upload
- YouTube video processing
- Progress tracking
- Error handling

### Authentication
- JWT-based authentication
- Protected routes
- User session management

### Responsive Design
- Mobile-first approach
- Tailwind CSS utilities
- Dark/light theme support

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:8006
VITE_APP_NAME=DeenBot
```

### API Integration

The frontend communicates with the backend through:
- **Base URL**: Configured via environment variables
- **Authentication**: JWT tokens in headers
- **Error Handling**: Centralized error management

## 🧪 Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Code Style

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Tailwind CSS**: Utility-first styling

## 📱 Components

### Core Components

- **ChatInterface**: Main chat UI
- **MessageBubble**: Individual message display
- **MediaUploader**: File upload component
- **YouTubeProcessor**: YouTube video processing
- **ConversationList**: Chat history sidebar

### UI Components (shadcn/ui)

- **Button**: Customizable button component
- **Input**: Form input fields
- **Card**: Content containers
- **Dialog**: Modal dialogs
- **Toast**: Notification system

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS for styling with:
- Custom color palette
- Responsive breakpoints
- Dark mode support
- Component variants

### Theme Configuration

```typescript
// tailwind.config.ts
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...},
      },
    },
  },
  plugins: [],
}
```

## 🔒 Security

- **XSS Protection**: Input sanitization
- **CSRF Protection**: Token-based requests
- **Secure Storage**: JWT tokens in httpOnly cookies
- **Environment Variables**: Sensitive data protection

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify

```bash
# Build the project
npm run build

# Deploy dist/ folder to Netlify
```

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Write meaningful component names
4. Add proper error handling
5. Test your changes thoroughly

## 📚 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
