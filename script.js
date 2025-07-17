const GAS_URL = "https://script.google.com/macros/s/AKfycbzN-2Vf9ZOq_tFVehR_S91Go5vg4G3jRu3K0AQcUUiYrsQ2tX8HA_31YQWxG-cNJx7r/exec?type=address";

  const map = L.map('map').setView([6.14825, 73.2900194], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let houseData = [];
  let markerLayer = null;
  let currentLatLng = null;
  let currentHouseName = "";

  // Funadhoo approximate bounding box (adjust as needed)
  const funadhooBounds = {
    north: 6.152,
    south: 6.145,
    east: 73.295,
    west: 73.284
  };

  async function loadHouses() {
    try {
      const response = await fetch(GAS_URL);
      houseData = await response.json();

      if (!Array.isArray(houseData)) {
        alert("Unexpected data format from server.");
        return;
      }

      document.getElementById("loader").style.display = "none";
      populateDropdown(houseData);
    } catch (err) {
      alert("Failed to load house data.");
      console.error(err);
    }
  }

  function populateDropdown(data) {
    const datalist = document.getElementById("houses-list");
    datalist.innerHTML = '';
    data.forEach(h => {
      const lat = Number(h.lat ?? h.latitude);
      const lng = Number(h.lng ?? h.longitude);
      if (h.name && !isNaN(lat) && !isNaN(lng)) {
        const option = document.createElement("option");
        option.value = h.name;
        datalist.appendChild(option);
      }
    });
  }

  function clearMarker() {
    if (markerLayer && map.hasLayer(markerLayer)) {
      map.removeLayer(markerLayer);
    }
  }

  function zoomToHouse(name) {
    clearMarker();

    const house = houseData.find(h => h.name && h.name.toLowerCase() === name.toLowerCase());
    if (!house) {
      alert("House not found.");
      return;
    }

    const lat = Number(house.lat ?? house.latitude);
    const lng = Number(house.lng ?? house.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Invalid coordinates for this house.");
      return;
    }

    map.setView([lat, lng], 18);
    currentLatLng = { lat, lng };
    currentHouseName = house.name;

    markerLayer = L.marker([lat, lng]).addTo(map).bindPopup(`<strong>${house.name}</strong>`).openPopup();

    // Show buttons except Reset View
    document.getElementById("directions-btn").style.display = "inline-block";
    document.getElementById("googlemaps-btn").style.display = "inline-block";
    document.getElementById("share-btn").style.display = "inline-block";
  }

  function resetView() {
    clearMarker();
    map.setView([6.14825, 73.2900194], 15);
    document.getElementById("dropdown").value = '';

    document.getElementById("directions-btn").style.display = "none";
    document.getElementById("googlemaps-btn").style.display = "none";
    document.getElementById("share-btn").style.display = "none";

    currentLatLng = null;
    currentHouseName = "";
  }

  document.getElementById("dropdown").addEventListener("change", e => {
    zoomToHouse(e.target.value.trim());
  });

  document.getElementById("clear-dropdown").addEventListener("click", () => {
    document.getElementById("dropdown").value = '';
    resetView();
  });

  document.getElementById("googlemaps-btn").addEventListener("click", () => {
    if (!currentLatLng) return;

    const url = `https://www.google.com/maps?q=${currentLatLng.lat},${currentLatLng.lng}&z=18&t=k`;
    window.open(url, '_blank');
  });

  document.getElementById("directions-btn").addEventListener("click", () => {
    if (!currentLatLng) {
      alert("Please select a house first.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(position => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      console.log("User location:", userLat, userLng);

      const isInFunadhoo =
        userLat >= funadhooBounds.south &&
        userLat <= funadhooBounds.north &&
        userLng >= funadhooBounds.west &&
        userLng <= funadhooBounds.east;

      if (isInFunadhoo) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${currentLatLng.lat},${currentLatLng.lng}&travelmode=walking`;
        window.open(url, '_blank');
      } else {
        alert("Your current location is outside Funadhoo. Directions only work from within Funadhoo.");
      }
    }, error => {
      if (error.code === error.PERMISSION_DENIED) {
        alert("Location permission denied. Please allow location access to get directions.");
      } else {
        alert("Unable to retrieve your location. Please try again.");
      }
      console.error(error);
    });
  });

  document.getElementById("share-btn").addEventListener("click", () => {
    if (!currentLatLng) return;

    const link = `https://maps.google.com/?q=${currentLatLng.lat},${currentLatLng.lng}`;
    const text = `Location of ${currentHouseName}: ${link}`;

    if (navigator.share) {
      navigator.share({
        title: currentHouseName,
        text: text,
        url: link
      }).catch(err => console.error("Share canceled or failed:", err));
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert("Link copied to clipboard:\n\n" + text);
      }).catch(() => {
        prompt("Copy this location link:", text);
      });
    }
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    resetView();
  });

  loadHouses();
