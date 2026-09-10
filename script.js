// 1. Core Constants: Target Coordinates for the Kaaba in Mecca
const MECCA_LAT = 21.4225;
const MECCA_LON = 39.8262;

// 2. State Variables
let qiblaAngleFromNorth = 0; // The fixed angle from true North to Mecca
let deviceHeading = 0;       // The live direction the user's phone is facing

// 3. UI Element Selectors
const needleEl = document.getElementById('needle');
const statusEl = document.getElementById('status');
const permissionBtn = document.getElementById('permissionBtn'); 

// 4. Initializer: Trigger geolocation immediately when the page loads
window.addEventListener('DOMContentLoaded', () => {
    if (navigator.geolocation) { 
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                
                // Calculate the final angle to Mecca from current position
                qiblaAngleFromNorth = calculateQiblaBearing(userLat, userLon);
                
                if (statusEl) {
                    statusEl.innerText = `Qibla Angle: ${qiblaAngleFromNorth.toFixed(1)}° from North.`;
                }
                
                // Draw initial state before sensor data arrives
                updateNeedleRotation();
                
                // Initialize internal hardware sensors for mobile rotation
                initCompassSensors();
            },
            (error) => {
                if (statusEl) statusEl.innerText = "Error: Please allow location access.";
                console.error("Location error:", error);
            }
        );
    } else {
        if (statusEl) statusEl.innerText = "Error: Geolocation unsupported.";
    }
});

// 5. Math Engine: Great-Circle Distance Bearing Formula
function calculateQiblaBearing(lat, lon) {
    // Convert current user inputs to Radians
    const phi1 = lat * Math.PI / 180;
    const phi2 = MECCA_LAT * Math.PI / 180;
    const deltaLambda = (MECCA_LON - lon) * Math.PI / 180;

    // Haversine/Bearing structural math
    const y = Math.sin(deltaLambda);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    
    let bearing = Math.atan2(y, x);
    
    // Convert back into degrees and normalize inside a 0 - 360 circle
    bearing = bearing * 180 / Math.PI;
    return (bearing + 360) % 360;
}

// 6. Sensor Controller: Initialize Mobile Compasses
function initCompassSensors() {
    // Check if handling an iOS device (Requires explicit runtime approval)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (permissionBtn) {
            permissionBtn.style.display = 'inline-block';
            permissionBtn.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            permissionBtn.style.display = 'none';
                            bindOrientationEvents();
                        }
                    })
                    .catch(console.error);
            });
        }
    } else {
        // Non-iOS / Android hardware
        bindOrientationEvents();
    }
}

// 7. Event Mapper: Router for different browser sensor standards
function bindOrientationEvents() {
    if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleDeviceMovement, true);
    } else {
        window.addEventListener('deviceorientation', handleDeviceMovement, true);
    }
}

// 8. Live Data Stream: Map sensor streams into raw angles
function handleDeviceMovement(event) {
    // iOS Safari Webkit standard
    if (event.webkitCompassHeading) {
        deviceHeading = event.webkitCompassHeading; 
    } 
    // Android/Chrome alpha standard
    else if (event.alpha) {
        deviceHeading = 360 - event.alpha; 
    }
    
    updateNeedleRotation();
}

// 9. Render Engine: Calculates correct rotation delta and visually mutates the DOM
function updateNeedleRotation() {
    if (!needleEl) return;
    
    // Formula maintains needle direction toward target fixed angle as phone rotates
    const targetOffsetRotation = qiblaAngleFromNorth - deviceHeading;
    needleEl.style.transform = `rotate(${targetOffsetRotation}deg)`;
}
