
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";
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

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
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

  // Search and category filtering
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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

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
          }),
        });

        const signupData = await signupResponse.json();

        if (!signupResponse.ok) {
          throw new Error(
            signupData.detail || "Signup failed"
          );
        }
      }

      // Login after signup or normal login
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
        throw new Error(
          loginData.detail || "Login failed"
        );
      }

      const accessToken = loginData.access_token;

      // Get logged-in student's profile
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
    setShowAuth(false);

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

      // Upload image to Supabase Storage
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

      // Save listing with JWT authentication
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

  const displayedItems = showMyListings ? myItems : filteredItems;

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
                {showMyListings ? "YOUR CAMPUS ACTIVITY" : "EXPLORE YOUR CAMPUS"}
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

          {showMyListings && (
            <button
              className="clear-filters back-marketplace"
              onClick={() => setShowMyListings(false)}
            >
              ← Back to Marketplace
            </button>
          )}

          {loading && (
            <p className="status">Loading marketplace...</p>
          )}

          {error && (
            <p className="status error">{error}</p>
          )}

          {!loading && !error && displayedItems.length === 0 && (
            <div className="empty-state">
              <div>{showMyListings ? "📋" : "📦"}</div>

              <h3>
                {showMyListings
                  ? "You haven't posted any items yet"
                  : items.length === 0
                    ? "No items listed yet"
                    : "No matching items found"}
              </h3>

              <p>
                {showMyListings
                  ? "Start sharing your unused items with fellow students."
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

                    {showMyListings && (
                      <span className="my-listing-label">
                        Your listing
                      </span>
                    )}
                  </div>
                </article>
              ))}
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
    </div>
  );
}

export default App;
