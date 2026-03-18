document.addEventListener("DOMContentLoaded", () => {
  const capabilitiesList = document.getElementById("capabilities-list");
  const capabilitySelect = document.getElementById("capability");
  const registerForm = document.getElementById("register-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const filterPracticeArea = document.getElementById("filter-practice-area");
  const filterVertical = document.getElementById("filter-vertical");
  const sortBy = document.getElementById("sort-by");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const resultsCount = document.getElementById("results-count");

  // Debounce helper to avoid firing on every keystroke
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // Build query string from current filter state
  function buildQueryParams() {
    const params = new URLSearchParams();
    const q = searchInput.value.trim();
    const area = filterPracticeArea.value;
    const vertical = filterVertical.value;
    const sort = sortBy.value;

    if (q) params.set("q", q);
    if (area) params.set("practice_area", area);
    if (vertical) params.set("industry_vertical", vertical);

    // Parse combined sort value (e.g. "capacity" = high-low desc, "capacity-asc" = asc)
    if (sort === "name") { params.set("sort_by", "name"); params.set("sort_order", "asc"); }
    else if (sort === "name-desc") { params.set("sort_by", "name"); params.set("sort_order", "desc"); }
    else if (sort === "capacity") { params.set("sort_by", "capacity"); params.set("sort_order", "desc"); }
    else if (sort === "capacity-asc") { params.set("sort_by", "capacity"); params.set("sort_order", "asc"); }
    else if (sort === "consultants") { params.set("sort_by", "consultants"); params.set("sort_order", "desc"); }
    else if (sort === "practice_area") { params.set("sort_by", "practice_area"); params.set("sort_order", "asc"); }

    return params.toString();
  }

  // Function to fetch capabilities from API
  async function fetchCapabilities() {
    const query = buildQueryParams();
    try {
      const response = await fetch(`/capabilities${query ? "?" + query : ""}`);
      const capabilities = await response.json();

      // Clear loading message
      capabilitiesList.innerHTML = "";

      // Update results count
      const count = Object.keys(capabilities).length;
      resultsCount.textContent = count === 0
        ? "No capabilities match your filters."
        : `Showing ${count} capability${count !== 1 ? "s" : ""}`;

      // Populate capabilities list
      Object.entries(capabilities).forEach(([name, details]) => {
        const capabilityCard = document.createElement("div");
        capabilityCard.className = "capability-card";

        const availableCapacity = details.capacity || 0;
        const currentConsultants = details.consultants ? details.consultants.length : 0;

        // Create consultants HTML with delete icons
        const consultantsHTML =
          details.consultants && details.consultants.length > 0
            ? `<div class="consultants-section">
              <h5>Registered Consultants:</h5>
              <ul class="consultants-list">
                ${details.consultants
                  .map(
                    (email) =>
                      `<li><span class="consultant-email">${email}</span><button class="delete-btn" data-capability="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No consultants registered yet</em></p>`;

        capabilityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Practice Area:</strong> ${details.practice_area}</p>
          <p><strong>Industry Verticals:</strong> ${details.industry_verticals ? details.industry_verticals.join(', ') : 'Not specified'}</p>
          <p><strong>Capacity:</strong> ${availableCapacity} hours/week available</p>
          <p><strong>Current Team:</strong> ${currentConsultants} consultants</p>
          <div class="consultants-container">
            ${consultantsHTML}
          </div>
        `;

        capabilitiesList.appendChild(capabilityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        capabilitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      capabilitiesList.innerHTML =
        "<p>Failed to load capabilities. Please try again later.</p>";
      console.error("Error fetching capabilities:", error);
    }
  }

  // Wire up filter controls
  const debouncedFetch = debounce(fetchCapabilities, 300);
  searchInput.addEventListener("input", debouncedFetch);
  filterPracticeArea.addEventListener("change", fetchCapabilities);
  filterVertical.addEventListener("change", fetchCapabilities);
  sortBy.addEventListener("change", fetchCapabilities);

  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterPracticeArea.value = "";
    filterVertical.value = "";
    sortBy.value = "name";
    fetchCapabilities();
  });

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const capability = button.getAttribute("data-capability");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const capability = document.getElementById("capability").value;

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/register?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        registerForm.reset();

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });

  // Initialize app
  fetchCapabilities();
});
