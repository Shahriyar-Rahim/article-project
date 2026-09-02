// 1. Initialize Firebase (PASTE YOUR CONFIG HERE)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 2. Setup Quill Editor (Only runs on write.html)
const editorContainer = document.getElementById("editor-container");
let quill;
if (editorContainer) {
  quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "Tell your story...",
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
      ],
    },
  });

  // Handle Publishing
  document.getElementById("publish-btn").addEventListener("click", async () => {
    const title = document.getElementById("post-title").value;
    const author = document.getElementById("author-name").value;
    const role = document.getElementById("post-role").value;
    const category = document.getElementById("post-category").value;
    const content = quill.root.innerHTML; // Gets formatted HTML

    if (!title || !author || quill.getText().trim().length === 0) {
      alert("Please fill in all fields before publishing.");
      return;
    }

    try {
      await db.collection("articles").add({
        title: title,
        author: author,
        role: role,
        category: category,
        content: content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      alert("Article Published Successfully!");
      window.location.href = "index.html"; // Redirect to feed
    } catch (error) {
      console.error("Error writing document: ", error);
      alert("Failed to publish.");
    }
  });
}

// 3. Fetch and Render Articles (Only runs on index.html)
const feedContainer = document.getElementById("feed-container");
if (feedContainer) {
  // Function to fetch articles based on category filter
  async function loadArticles(categoryFilter = "All") {
    feedContainer.innerHTML = ""; // Clear current feed
    let query = db.collection("articles").orderBy("createdAt", "desc");

    if (categoryFilter !== "All") {
      query = db
        .collection("articles")
        .where("category", "==", categoryFilter)
        .orderBy("createdAt", "desc");
    }

    try {
      const snapshot = await query.get();
      if (snapshot.empty) {
        feedContainer.innerHTML = "<p>No articles found in this category.</p>";
        return;
      }

      snapshot.forEach((doc) => {
        const article = doc.data();

        // Format the timestamp securely
        const dateString = article.createdAt
          ? article.createdAt.toDate().toLocaleDateString()
          : "Just now";

        const articleCard = `
                    <article class="card">
                        <div class="card-meta">
                            <span class="badge role-${article.role.toLowerCase()}">${article.role}</span>
                            <span class="badge category">${article.category}</span>
                            <span class="date">${dateString} • By ${article.author}</span>
                        </div>
                        <h2>${article.title}</h2>
                        <div class="card-content">
                            ${article.content}
                        </div>
                    </article>
                `;
        feedContainer.innerHTML += articleCard;
      });
    } catch (error) {
      console.error("Error loading articles: ", error);
      feedContainer.innerHTML = "<p>Error loading feed. Check console.</p>";
    }
  }

  // Load all articles initially
  loadArticles("All");

  // Handle Category Filtering
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Update active styling
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      // Reload with filter
      loadArticles(e.target.dataset.filter);
    });
  });
}
