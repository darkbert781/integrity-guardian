import React, { useState } from 'react';
import api from '../lib/api';

export function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="bg-surface p-8 rounded-lg shadow-lg w-96 border border-gray-700">
        <h2 className="text-2xl font-bold text-primary mb-6 text-center">Integrity Guardian</h2>
        <input className="w-full mb-4 p-2 bg-gray-800 rounded border border-gray-600 focus:border-primary" placeholder="Username" />
        <input className="w-full mb-4 p-2 bg-gray-800 rounded border border-gray-600 focus:border-primary" type="password" placeholder="Password" />
        <input className="w-full mb-6 p-2 bg-gray-800 rounded border border-gray-600 focus:border-primary" placeholder="TOTP Code" />
        <button className="w-full bg-primary hover:bg-blue-600 p-2 rounded font-bold transition">Login</button>
      </div>
    </div>
  );
}
