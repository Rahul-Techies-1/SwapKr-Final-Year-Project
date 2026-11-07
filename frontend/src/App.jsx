
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "recampus_access_token";

function App() {
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || ""
  );

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [showMyListings, setShowMyListings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // AI Semantic Search states
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);

  // AI Similar Items Recommendation states
  const [similarItems, setSimilarItems] = useState([]);
  const [selectedSimilarItem, setSelectedSimilarItem] = useState(null);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState("");

  // Delete listing states
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState(false);

  // WhatsApp contact states
  const [contactingItemId, setContactingItemId] = useState(null);
  const [contactMessage, setContactMessage] = useState("");

  // Edit listing states
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "0",
    category: "Books",
    location: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    phone_number: "",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "0",
    category: "Books",
    location: "",
  });

  // Fetch all public marketplace items
  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/items`);

      if (!response.ok) {
        throw new Error("Unable to fetch items");
      }

      const data = await response.json();
      setItems(data);
      setError("");
    } catch {
      setError("Unable to connect to ReCampus. Check your backend.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch logged-in student's listings
  const fetchMyListings = async (accessToken = token) => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_URL}/my-listings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to fetch your listings");
      }

      const data = await response.json();
      setMyItems(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Restore login session and load marketplace
  useEffect(() => {
    const initializeApp = async () => {
      await fetchItems();

      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) return;

      try {
        const response = await fetch(`${API_URL}/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Session expired");
        }

        const userData = await response.json();

        setToken(savedToken);
        setUser(userData);
        await fetchMyListings(savedToken);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setUser(null);
      }
    };

    initializeApp();
  }, []);

  // Normal keyword search and category filtering
  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      item.title?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search);

    const matchesCategory =
      selectedCategory === "All" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Apply category filter to AI search results
  const aiFilteredItems = aiResults.filter((item) => {
    return (
      selectedCategory === "All" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  });

  // Clear all search and category filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setAiQuery("");
    setAiResults([]);
    setAiError("");
    setIsAiSearchActive(false);
  };

  // AI Semantic Search
  const handleAiSearch = async (e) => {
    e.preventDefault();

    const query = aiQuery.trim();

    if (query.length < 2) {
      setAiError("Please enter at least 2 characters.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setIsAiSearchActive(false);

    try {
      const response = await fetch(
        `${API_URL}/items/semantic-search?q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "AI search failed.");
      }

      setAiResults(data);
      setIsAiSearchActive(true);
    } catch (err) {
      setAiError(err.message || "Unable to perform AI search.");
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch AI-powered similar item recommendations
  const handleFindSimilarItems = async (item) => {
    setSelectedSimilarItem(item);
    setSimilarItems([]);
    setSimilarError("");
    setSimilarLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/items/${item.id}/similar`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to fetch similar items."
        );
      }

      setSimilarItems(data);
    } catch (err) {
      setSimilarError(
        err.message || "Unable to load recommendations."
      );
    } finally {
      setSimilarLoading(false);
    }
  };

  // Close recommendations
  const clearSimilarItems = () => {
    setSelectedSimilarItem(null);
    setSimilarItems([]);
    setSimilarError("");
  };

  // Handle normal listing form changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Handle authentication form changes
  const handleAuthChange = (e) => {
    const { name, value } = e.target;

    setAuthForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Login and Signup
  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    setAuthSubmitting(true);
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        const signupResponse = await fetch(`${API_URL}/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: authForm.name,
            email: authForm.email,
            password: authForm.password,
            college: authForm.college,
            phone_number: authForm.phone_number,
          }),
        });

        const signupData = await signupResponse.json();

        if (!signupResponse.ok) {
          throw new Error(signupData.detail || "Signup failed");
        }
      }

      const loginResponse = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.detail || "Login failed");
      }

      const accessToken = loginData.access_token;

      const profileResponse = await fetch(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error("Unable to load student profile");
      }

      const profileData = await profileResponse.json();

      localStorage.setItem(TOKEN_KEY, accessToken);

      setToken(accessToken);
      setUser(profileData);
      setShowAuth(false);
      setAuthMessage("");

      setAuthForm({
        name: "",
        email: "",
        password: "",
        college: "",
        phone_number: "",
      });

      await fetchMyListings(accessToken);
    } catch (err) {
      setAuthMessage(err.message || "Something went wrong");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);

    setToken("");
    setUser(null);
    setMyItems([]);
    setShowMyListings(false);
    setShowForm(false);
    setEditingItem(null);
    setShowAuth(false);
    setDeleteMessage("");

    setMessage("You have logged out successfully.");
  };

  // Open My Listings
  const handleMyListings = async () => {
    if (!user) {
      setAuthMode("login");
      setShowAuth(true);
      setAuthMessage("Please login to view your listings.");
      return;
    }

    await fetchMyListings();

    setShowMyListings(true);

    document.getElementById("marketplace")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // Open Edit Listing form with existing item details
  const handleEditItem = (item) => {
    setEditingItem(item);

    setEditForm({
      title: item.title || "",
      description: item.description || "",
      price: String(item.price ?? 0),
      category: item.category || "Other",
      location: item.location || "",
    });

    setEditMessage("");
  };

  // Save edited listing
  const handleUpdateItem = async (e) => {
    e.preventDefault();

    if (!editingItem || !token) return;

    setEditSubmitting(true);
    setEditMessage("");

    try {
      const response = await fetch(
        `${API_URL}/items/${editingItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description,
            price: Number(editForm.price),
            category: editForm.category,
            location: editForm.location.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update listing");
      }

      setEditingItem(null);
      setEditMessage("");

      setDeleteMessage("Listing updated successfully!");
      setDeleteError(false);

      await Promise.all([
        fetchItems(),
        fetchMyListings(),
      ]);
    } catch (err) {
      setEditMessage(err.message || "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete a listing owned by the logged-in student
  const handleDeleteItem = async (itemId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingItemId(itemId);
    setDeleteMessage("");
    setDeleteError(false);

    try {
      const response = await fetch(`${API_URL}/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to delete listing");
      }

      setDeleteMessage("Listing deleted successfully!");

      await Promise.all([
        fetchItems(),
        fetchMyListings(),
      ]);

      // Remove deleted item from current AI results too
      setAiResults((previous) =>
        previous.filter((item) => item.id !== itemId)
      );
    } catch (err) {
      setDeleteError(true);
      setDeleteMessage(err.message || "Something went wrong");
    } finally {
      setDeletingItemId(null);
    }
  };

  // Contact seller through WhatsApp
  const handleContactSeller = async (item) => {
    if (!user || !token) {
      setAuthMode("login");
      setAuthMessage("Please login to contact the seller.");
      setShowAuth(true);
      return;
    }

    setContactingItemId(item.id);
    setContactMessage("");

    // Open a blank tab immediately to avoid popup blockers.
    const whatsappWindow = window.open("about:blank", "_blank");

    if (!whatsappWindow) {
      setContactMessage(
        "Please allow pop-ups for ReCampus to open WhatsApp."
      );
      setContactingItemId(null);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/items/${item.id}/seller-contact`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to get seller contact details."
        );
      }

      const phone = data.phone_number.replace(/\D/g, "");

      if (phone.length < 10) {
        throw new Error("Seller's WhatsApp number is invalid.");
      }

      const whatsappMessage = `Hi ${data.name}, I'm interested in your item "${item.title}" listed on ReCampus. Is it still available?`;

      const whatsappUrl =
        `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`;

      whatsappWindow.location.href = whatsappUrl;

    } catch (err) {
      whatsappWindow.close();
      setContactMessage(err.message || "Unable to contact seller.");
    } finally {
      setContactingItemId(null);
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please select a JPG, PNG or WEBP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setMessage("");
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Create a new listing
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !token) {
      setShowForm(false);
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      let imageUrl = "";

      if (selectedImage) {
        const imageData = new FormData();
        imageData.append("file", selectedImage);

        const uploadResponse = await fetch(
          `${API_URL}/upload-image`,
          {
            method: "POST",
            body: imageData,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            errorData.detail || "Image upload failed"
          );
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.image_url;
      }

      const response = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          image_url: imageUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Unable to create listing"
        );
      }

      setMessage("Your item has been listed successfully!");

      setForm({
        title: "",
        description: "",
        price: "0",
        category: "Books",
        location: "",
      });

      setSelectedImage(null);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview("");

      await fetchItems();
      await fetchMyListings();

      setShowForm(false);
    } catch (err) {
      console.error("Listing error:", err);
      setMessage(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const displayedItems = showMyListings
    ? myItems
    : isAiSearchActive
      ? aiFilteredItems
      : filteredItems;

  return (
    <div className="app">
      <nav className="navbar">
        <a
          className="logo"
          href="#home"
          onClick={() => setShowMyListings(false)}
        >
          Re<span>Campus</span>
          <small>REUSE. RECONNECT. RESTART.</small>
        </a>

        <div className="nav-links">
          <a href="#home" onClick={() => setShowMyListings(false)}>
            Home
          </a>

          <a
            href="#marketplace"
            onClick={() => setShowMyListings(false)}
          >
            Marketplace
          </a>

          {user && (
            <button
              className="nav-text-button"
              onClick={handleMyListings}
            >
              My Listings
            </button>
          )}

          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="welcome-user">
                Hi, {user.name.split(" ")[0]}
              </span>

              <button
                className="auth-nav-button logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="auth-nav-button"
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
                setShowAuth(true);
              }}
            >
              Login / Signup
            </button>
          )}

          <button
            className="post-button"
            onClick={() => {
              if (!user) {
                setAuthMode("login");
                setAuthMessage("Please login before posting an item.");
                setShowAuth(true);
                return;
              }

              setMessage("");
              setShowForm(true);
            }}
          >
            + Post an Item
          </button>
        </div>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">
              YOUR CAMPUS MARKETPLACE
            </span>

            <h1>
              Give your unused items
              <br />
              <span>a new beginning.</span>
            </h1>

            <p>
              Buy, sell and reuse college essentials.
              Connect with students from your own campus.
            </p>

            <a className="explore-button" href="#marketplace">
              Explore Marketplace →
            </a>
          </div>

          <div className="hero-visual">
            <div className="visual-card card-one">📚 Books</div>
            <div className="visual-card card-two">🪑 Furniture</div>
            <div className="visual-card card-three">💻 Electronics</div>
            <div className="hero-circle">♻️</div>
          </div>
        </section>

        <section className="marketplace" id="marketplace">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {showMyListings
                  ? "YOUR CAMPUS ACTIVITY"
                  : "EXPLORE YOUR CAMPUS"}
              </span>

              <h2>
                {showMyListings ? "My Listings" : "Fresh finds for you"}
              </h2>

              <p>
                {showMyListings
                  ? "Manage and view the items you have posted."
                  : "Discover useful items listed by fellow students."}
              </p>
            </div>

            <span className="item-count">
              {showMyListings
                ? `${myItems.length} listings`
                : isAiSearchActive
                  ? `${aiFilteredItems.length} AI matches`
                  : `${filteredItems.length} of ${items.length} items`}
            </span>
          </div>

          {!showMyListings && (
            <div className="marketplace-controls">
              <div className="search-box">
                <span className="search-icon">⌕</span>

                <input
                  type="text"
                  placeholder="Search items, descriptions or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => setSearchTerm("")}
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                className="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Books">Books</option>
                <option value="Furniture">Furniture</option>
                <option value="Electronics">Electronics</option>
                <option value="Hostel Essentials">Hostel Essentials</option>
                <option value="Other">Other</option>
              </select>

              {(searchTerm || selectedCategory !== "All") && (
                <button
                  className="clear-filters"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* AI Semantic Search */}
          {!showMyListings && (
            <form
              className="ai-search-container"
              onSubmit={handleAiSearch}
            >
              <div className="ai-search-heading">
                <div>
                  <span className="ai-search-label">
                    ✦ AI POWERED SEARCH
                  </span>

                  <h3>Search by meaning, not just keywords</h3>

                  <p>
                    Describe what you need, and ReCampus will
                    find related items for you.
                  </p>
                </div>
              </div>

              <div className="ai-search-input-row">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="e.g. Something comfortable to sleep on..."
                  minLength={2}
                  maxLength={200}
                />

                <button type="submit" disabled={aiLoading}>
                  {aiLoading ? "Searching..." : "✦ AI Search"}
                </button>
              </div>

              {aiError && (
                <p className="ai-search-error">{aiError}</p>
              )}

              {isAiSearchActive && (
                <div className="ai-search-result-info">
                  <span>
                    ✦ AI results for "{aiQuery}" —{" "}
                    {aiFilteredItems.length} matches
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAiSearchActive(false);
                      setAiResults([]);
                      setAiQuery("");
                      setAiError("");
                    }}
                  >
                    Clear AI Search ×
                  </button>
                </div>
              )}
            </form>
          )}

          {showMyListings && (
            <>
              <button
                className="clear-filters back-marketplace"
                onClick={() => {
                  setShowMyListings(false);
                  setDeleteMessage("");
                }}
              >
                ← Back to Marketplace
              </button>

              {deleteMessage && (
                <p
                  className={`delete-message ${
                    deleteError ? "delete-error" : ""
                  }`}
                >
                  {deleteMessage}
                </p>
              )}
            </>
          )}

          {loading && (
            <p className="status">Loading marketplace...</p>
          )}

          {error && (
            <p className="status error">{error}</p>
          )}

          {contactMessage && (
            <p className="status error">{contactMessage}</p>
          )}

          {!loading && !error && displayedItems.length === 0 && (
            <div className="empty-state">
              <div>{showMyListings ? "📋" : "📦"}</div>

              <h3>
                {showMyListings
                  ? "You haven't posted any items yet"
                  : items.length === 0
                    ? "No items listed yet"
                    : isAiSearchActive
                      ? "No related items found"
                      : "No matching items found"}
              </h3>

              <p>
                {showMyListings
                  ? "Start sharing your unused items with fellow students."
                  : items.length === 0
                    ? "Be the first to list an item."
                    : isAiSearchActive
                      ? "Try describing your requirement differently."
                      : "Try another search or be the first to list an item."}
              </p>

              {showMyListings ? (
                user && (
                  <button
                    className="clear-filters"
                    onClick={() => setShowForm(true)}
                  >
                    + Post an Item
                  </button>
                )
              ) : (
                items.length > 0 && (
                  <button
                    className="clear-filters"
                    onClick={clearFilters}
                  >
                    Clear all filters
                  </button>
                )
              )}
            </div>
          )}

          {!loading && !error && displayedItems.length > 0 && (
            <div className="items-grid">
              {displayedItems.map((item) => (
                <article className="item-card" key={item.id}>
                  <div className="item-image">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} />
                    ) : (
                      <span>📦</span>
                    )}

                    <span className="category-tag">
                      {item.category || "Other"}
                    </span>
                  </div>

                  <div className="item-details">
                    <h3>{item.title}</h3>

                    <p>
                      {item.description || "No description available"}
                    </p>

                    <div className="item-bottom">
                      <strong>
                        {item.price === 0 ? "FREE" : `₹${item.price}`}
                      </strong>

                      <span>
                        📍 {item.location || "Campus"}
                      </span>
                    </div>

                    {!showMyListings && (
                      <>
                        <button
                          className="similar-items-button"
                          style={{
                            display: "block",
                            background: "red",
                            color: "white",
                            padding: "15px",
                            width: "100%",
                            visibility: "visible",
                          }}
                          onClick={() => handleFindSimilarItems(item)}
                          disabled={similarLoading}
                          type="button"
                        >
                          ✦ Find Similar Items
                        </button>

                        <button
                          className="contact-seller-button"
                          onClick={() => handleContactSeller(item)}
                          disabled={contactingItemId === item.id}
                          type="button"
                        >
                          {contactingItemId === item.id
                            ? "Connecting..."
                            : "💬 Contact Seller on WhatsApp"}
                        </button>
                      </>
                    )}

                    {showMyListings && (
                      <div className="my-listing-actions">
                        <span className="my-listing-label">
                          Your listing
                        </span>

                        <div className="listing-action-buttons">
                          <button
                            className="edit-listing-button"
                            onClick={() => handleEditItem(item)}
                          >
                            Edit Listing
                          </button>

                          <button
                            className="delete-listing-button"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deletingItemId === item.id}
                          >
                            {deletingItemId === item.id
                              ? "Deleting..."
                              : "Delete Listing"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* AI Similar Items Recommendations */}
          {!showMyListings && selectedSimilarItem && (
            <div className="similar-items-section">
              <div className="similar-items-heading">
                <div>
                  <span className="ai-search-label">
                    ✦ AI RECOMMENDATIONS
                  </span>

                  <h2>Similar items you might like</h2>

                  <p>
                    Recommendations based on{" "}
                    <strong>{selectedSimilarItem.title}</strong>
                  </p>
                </div>

                <button
                  className="similar-close-button"
                  onClick={clearSimilarItems}
                  type="button"
                  aria-label="Close recommendations"
                >
                  ×
                </button>
              </div>

              {similarLoading && (
                <p className="status">
                  Finding similar items for you...
                </p>
              )}

              {similarError && (
                <p className="ai-search-error">
                  {similarError}
                </p>
              )}

              {!similarLoading &&
                !similarError &&
                similarItems.length === 0 && (
                  <div className="empty-state">
                    <div>🔎</div>
                    <h3>No similar items found</h3>
                    <p>
                      Try exploring another listing.
                    </p>
                  </div>
                )}

              {!similarLoading &&
                !similarError &&
                similarItems.length > 0 && (
                  <div className="items-grid">
                    {similarItems.map((item) => (
                      <article
                        className="item-card"
                        key={item.id}
                      >
                        <div className="item-image">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                            />
                          ) : (
                            <span>📦</span>
                          )}

                          <span className="category-tag">
                            {item.category || "Other"}
                          </span>
                        </div>

                        <div className="item-details">
                          <h3>{item.title}</h3>

                          <p>
                            {item.description ||
                              "No description available"}
                          </p>

                          <div className="item-bottom">
                            <strong>
                              {item.price === 0
                                ? "FREE"
                                : `₹${item.price}`}
                            </strong>

                            <span>
                              📍 {item.location || "Campus"}
                            </span>
                          </div>

                          <button
                            className="contact-seller-button"
                            onClick={() =>
                              handleContactSeller(item)
                            }
                            disabled={
                              contactingItemId === item.id
                            }
                            type="button"
                          >
                            {contactingItemId === item.id
                              ? "Connecting..."
                              : "💬 Contact Seller on WhatsApp"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
            </div>
          )}
        </section>

        <section className="about" id="about">
          <h2>One campus. A smarter way to reuse.</h2>

          <p>
            ReCampus helps students find affordable essentials
            while giving pre-loved items a second life.
          </p>
        </section>
      </main>

      <footer>
        <p>
          © 2026 ReCampus. Made for campus communities. ♻️
        </p>
      </footer>

      {/* Authentication Modal */}
      {showAuth && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!authSubmitting) setShowAuth(false);
          }}
        >
          <div
            className="auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  WELCOME TO RECAMPUS
                </span>

                <h2>
                  {authMode === "login"
                    ? "Welcome back!"
                    : "Create your account"}
                </h2>

                <p>
                  {authMode === "login"
                    ? "Login to continue your campus journey."
                    : "Join your campus community today."}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => setShowAuth(false)}
                disabled={authSubmitting}
              >
                ×
              </button>
            </div>

            <div className="auth-tabs">
              <button
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthMessage("");
                }}
                type="button"
              >
                Login
              </button>

              <button
                className={authMode === "signup" ? "active" : ""}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthMessage("");
                }}
                type="button"
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authMode === "signup" && (
                <>
                  <label>
                    Full Name *
                    <input
                      name="name"
                      value={authForm.name}
                      onChange={handleAuthChange}
                      placeholder="Enter your full name"
                      minLength="2"
                      maxLength="100"
                      required
                    />
                  </label>

                  <label>
                    College Name *
                    <input
                      name="college"
                      value={authForm.college}
                      onChange={handleAuthChange}
                      placeholder="Enter your college name"
                      minLength="2"
                      maxLength="150"
                      required
                    />
                  </label>

                  <label>
                    WhatsApp Number *
                    <input
                      type="tel"
                      name="phone_number"
                      value={authForm.phone_number}
                      onChange={handleAuthChange}
                      placeholder="+919876543210"
                      pattern="^\\+?[0-9]{10,19}$"
                      title="Enter your number with country code, e.g. +919876543210"
                      minLength="10"
                      maxLength="20"
                      required
                    />
                  </label>
                </>
              )}

              <label>
                Email Address *
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  placeholder="student@example.com"
                  required
                />
              </label>

              <label>
                Password *
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  placeholder="Enter your password"
                  minLength="8"
                  maxLength="128"
                  required
                />
              </label>

              {authMessage && (
                <p className="auth-message">{authMessage}</p>
              )}

              <button
                className="submit-listing"
                type="submit"
                disabled={authSubmitting}
              >
                {authSubmitting
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Login to ReCampus →"
                    : "Create Account →"}
              </button>
            </form>

            <p className="auth-switch-text">
              {authMode === "login"
                ? "New to ReCampus? "
                : "Already have an account? "}

              <button
                type="button"
                onClick={() => {
                  setAuthMode(
                    authMode === "login" ? "signup" : "login"
                  );
                  setAuthMessage("");
                }}
              >
                {authMode === "login" ? "Sign up" : "Login"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Post Item Modal */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!submitting) setShowForm(false);
          }}
        >
          <div
            className="listing-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  SELL OR GIVE AWAY
                </span>

                <h2>Post your item</h2>

                <p>Give your unused item a new home.</p>
              </div>

              <button
                className="close-button"
                onClick={() => setShowForm(false)}
                type="button"
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Item name *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Study table"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe your item and its condition..."
                  rows="3"
                />
              </label>

              <div className="form-row">
                <label>
                  Category *
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option>Books</option>
                    <option>Furniture</option>
                    <option>Electronics</option>
                    <option>Hostel Essentials</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Price (₹)
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    required
                  />
                </label>
              </div>

              <label>
                Campus / Hostel location *
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Hostel Block A"
                  required
                />
              </label>

              <label>
                Upload Item Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
              </label>

              {imagePreview && (
                <div className="image-preview">
                  <img
                    src={imagePreview}
                    alt="Selected item preview"
                    style={{
                      width: "150px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      marginTop: "12px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(imagePreview);
                      setSelectedImage(null);
                      setImagePreview("");
                    }}
                  >
                    Remove image
                  </button>
                </div>
              )}

              {message && (
                <p className="form-message">{message}</p>
              )}

              <button
                className="submit-listing"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Publishing..."
                  : "Publish Listing →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingItem && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!editSubmitting) {
              setEditingItem(null);
              setEditMessage("");
            }
          }}
        >
          <div
            className="listing-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  MANAGE YOUR ITEM
                </span>

                <h2>Edit your listing</h2>

                <p>Update your item details below.</p>
              </div>

              <button
                className="close-button"
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setEditMessage("");
                }}
                disabled={editSubmitting}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateItem}>
              <label>
                Item name *
                <input
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  placeholder="Enter item name"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  placeholder="Describe your item and its condition..."
                  rows="3"
                />
              </label>

              <div className="form-row">
                <label>
                  Category *
                  <select
                    name="category"
                    value={editForm.category}
                    onChange={handleEditChange}
                  >
                    <option>Books</option>
                    <option>Furniture</option>
                    <option>Electronics</option>
                    <option>Hostel Essentials</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Price (₹)
                  <input
                    type="number"
                    name="price"
                    value={editForm.price}
                    onChange={handleEditChange}
                    min="0"
                    step="1"
                    required
                  />
                </label>
              </div>

              <label>
                Campus / Hostel location *
                <input
                  name="location"
                  value={editForm.location}
                  onChange={handleEditChange}
                  placeholder="e.g. Hostel Block A"
                  required
                />
              </label>

              {editMessage && (
                <p className="form-message">{editMessage}</p>
              )}

              <button
                className="submit-listing"
                type="submit"
                disabled={editSubmitting}
              >
                {editSubmitting
                  ? "Saving changes..."
                  : "Save Changes →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
