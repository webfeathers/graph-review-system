import type { NextPage } from 'next';
import Link from 'next/link';

const Home: NextPage = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Graph Review App</h1>
        <p className="mb-8">A simple application for reviewing and discussing graphs</p>
        
        <div className="space-x-4">
          <Link href="/login" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Login
          </Link>
          <Link href="/register" className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;