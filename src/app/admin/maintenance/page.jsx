'use client'

import { useState, useEffect } from 'react'

export default function MaintenanceAdmin() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetchMaintenanceStatus()
  }, [])

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/maintenance')
      const data = await response.json()
      setMaintenanceMode(data.maintenanceMode)
    } catch (error) {
      console.error('Error fetching maintenance status:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMaintenance = async () => {
    setToggling(true)
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !maintenanceMode }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setMaintenanceMode(data.maintenanceMode)
        alert(data.message)
      } else {
        const error = await response.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error toggling maintenance:', error)
      alert('Failed to toggle maintenance mode')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>Maintenance Mode Control</h1>
      
      <div style={{ 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: maintenanceMode ? '#fff3cd' : '#d4edda',
        margin: '20px 0'
      }}>
        <h3>Current Status</h3>
        <p style={{ 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: maintenanceMode ? '#856404' : '#155724'
        }}>
          {maintenanceMode ? '🔧 MAINTENANCE MODE ON' : '✅ SITE LIVE'}
        </p>
        
        {maintenanceMode && (
          <p style={{ color: '#856404' }}>
            All traffic is being redirected to the maintenance page.
          </p>
        )}
        
        {!maintenanceMode && (
          <p style={{ color: '#155724' }}>
            Site is operating normally.
          </p>
        )}
      </div>

      <button
        onClick={toggleMaintenance}
        disabled={toggling}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: maintenanceMode ? '#28a745' : '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: toggling ? 'not-allowed' : 'pointer',
          opacity: toggling ? 0.7 : 1
        }}
      >
        {toggling ? 'Processing...' : (maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode')}
      </button>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
        <h3>Instructions</h3>
        <ul style={{ textAlign: 'left' }}>
          <li>Click the button above to toggle maintenance mode on/off</li>
          <li>When enabled, all visitors will see the maintenance page</li>
          <li>Changes take effect immediately (may require page refresh)</li>
          <li>The maintenance page itself remains accessible at /maintenance</li>
        </ul>
      </div>
    </div>
  )
}
