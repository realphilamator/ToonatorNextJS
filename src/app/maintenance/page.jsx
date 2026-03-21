
'use client';

import { useEffect } from 'react';

export const metadata = {
  title: 'Maintenance - Toonator',
  description: 'Toonator is currently undergoing maintenance.',
};

export default function MaintenancePage() {
  useEffect(() => {
    document.documentElement.lang = 'en';
  }, []);

  return (
    <>
      <link rel="stylesheet" href="/css/style.css" />
      <link rel="stylesheet" href="/css/theme.css" />
      <style jsx>{`
        #content {
          text-align: center;
          padding-top: 120px;
        }

        #maintenance_box {
          width: 600px;
          margin: 120px auto;
          padding: 40px;
          text-align: center;
          background: #eeeeee;
          border-radius: 8px;
          border: 1px solid #cccccc;
        }

        #maintenance_box h1 {
          font-size: 32px;
          margin-bottom: 20px;
        }

        #maintenance_box p {
          font-size: 14px;
          text-align: center;
        }

        .status_dot {
          width: 10px;
          height: 10px;
          background: red;
          display: inline-block;
          border-radius: 50%;
          margin-right: 6px;
        }
      `}</style>

      <div id="header_wrap">
        <div id="header">
          <a className="logo" href="/">
            <img src="/img/toonator40.png" alt="Toonator" />
          </a>
        </div>
      </div>

      <div id="content_wrap">
        <div id="content">
          <div id="maintenance_box">
            <h1>Site Maintenance</h1>
            
            <p>
              <span className="status_dot"></span>
              <span>The site is temporarily offline for maintenance.</span>
            </p>
            
            <p>We're doing some updates and improvements.</p>
            
            <p>Please check back later today.</p>
          </div>
        </div>
      </div>

      <div id="footer">
        <p style={{ textAlign: 'center' }}>toonator.com</p>
      </div>
    </>
  )
}
