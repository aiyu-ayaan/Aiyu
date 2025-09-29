
import React from 'react';
import '../../styles/Divider.css';

const Divider = () => {
  return (
    <div className="w-full flex justify-center my-8 overflow-hidden">
      <svg className="w-2/5 md:w-1/3" height="40" viewBox="0 0 400 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g className="wave-animation">
          <path d="M0 20 C 10 0, 20 40, 30 20 C 40 0, 50 40, 60 20 C 70 0, 80 40, 90 20 C 100 0, 110 40, 120 20 C 130 0, 140 40, 150 20 C 160 0, 170 40, 180 20 C 190 0, 200 40, 210 20 C 220 0, 230 40, 240 20 C 250 0, 260 40, 270 20 C 280 0, 290 40, 300 20 C 310 0, 320 40, 330 20 C 340 0, 350 40, 360 20 C 370 0, 380 40, 390 20 C 395 10, 400 30, 400 20" stroke="#6B7280" strokeWidth="2" fill="transparent"/>
          <path d="M400 20 C 410 0, 420 40, 430 20 C 440 0, 450 40, 460 20 C 470 0, 480 40, 490 20 C 500 0, 510 40, 520 20 C 530 0, 540 40, 550 20 C 560 0, 570 40, 580 20 C 590 0, 600 40, 610 20 C 620 0, 630 40, 640 20 C 650 0, 660 40, 670 20 C 680 0, 690 40, 700 20 C 710 0, 720 40, 730 20 C 740 0, 750 40, 760 20 C 770 0, 780 40, 790 20 C 795 10, 800 30, 800 20" stroke="#6B7280" strokeWidth="2" fill="transparent"/>
        </g>
      </svg>
    </div>
  );
};

export default Divider;
