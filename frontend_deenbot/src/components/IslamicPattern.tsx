import React from 'react';

const IslamicPattern: React.FC = () => {
  return (
    <svg
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className="text-emerald-900 dark:text-emerald-600"
    >
      <defs>
        <pattern
          id="arabesque"
          x="0"
          y="0"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          {/* Stylized Islamic geometric pattern */}
          <path
            d="M50,0 L100,50 L50,100 L0,50 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path
            d="M20,20 L80,20 L80,80 L20,80 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <path
            d="M35,35 C40,20 60,20 65,35 C80,40 80,60 65,65 C60,80 40,80 35,65 C20,60 20,40 35,35 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <path
            d="M0,0 L25,25 M0,100 L25,75 M100,0 L75,25 M100,100 L75,75"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#arabesque)" />
    </svg>
  );
};

export default IslamicPattern;
