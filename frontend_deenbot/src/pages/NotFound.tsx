
import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';

const NotFound: React.FC = () => {
  return (
    <Layout>
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl mt-4 mb-8">Page not found</p>
        <Button asChild>
          <Link to="/chat">Go to Chat</Link>
        </Button>
      </div>
    </Layout>
  );
};

export default NotFound;
