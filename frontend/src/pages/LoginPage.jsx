import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(formData.username, formData.password);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <div className="bg-red-100 text-red-600 p-2 mb-4 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-brand-blue"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-brand-purple to-brand-teal text-white p-2 rounded hover:opacity-90 transition"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600 text-sm">
          Don't have an account? <Link to="/register" className="text-brand-blue">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
