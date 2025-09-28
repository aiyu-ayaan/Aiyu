
"use client";
import React from 'react';

const YearNode = ({ year }) => {
  return (
    <div className="flex justify-center items-center">
      <div className="w-24 h-24 bg-orange-500 rounded-full flex justify-center items-center">
        <span className="text-white font-bold text-xl">{year}</span>
      </div>
    </div>
  );
};

export default YearNode;
