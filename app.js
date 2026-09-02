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

const subcategoriesMap = {
  Academic: [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Electronics",
    "English",
  ],
  Experience: ["Internship", "Research", "Campus Life", "Club Activities"],
  Projects: [
    "Full-Stack MERN",
    "Machine Learning",
    "Embedded Systems",
    "Mobile Apps",
  ],
  Jobs: ["Full-Time", "Remote", "Freelance", "On-Campus"],
  Blog: ["Tech Insights", "Career Advice", "Personal Stories", "Tutorials"],
};

// 1. Editor Logic (write.html)
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

  const categorySelect = document.getElementById("post-category");
  const subcategorySelect = document.getElementById("post-subcategory");
  const customCategoryInput = document.getElementById("custom-category");
  const customSubcategoryInput = document.getElementById("custom-subcategory");

  function updateSubcategories() {
    const selectedCategory = categorySelect.value;

    if (selectedCategory === "Other") {
      customCategoryInput.style.display = "block";
      customSubcategoryInput.style.display = "block";
      subcategorySelect.style.display = "none";
      customSubcategoryInput.placeholder = "Enter custom topic...";
    } else {
      customCategoryInput.style.display = "none";
      subcategorySelect.style.display = "block";

      const subs = subcategoriesMap[selectedCategory] || [];
      subcategorySelect.innerHTML = "";
      subs.forEach((sub) => {
        const option = document.createElement("option");
        option.value = sub;
        option.textContent = sub;
        subcategorySelect.appendChild(option);
      });

      const otherSubOption = document.createElement("option");
      otherSubOption.value = "Other";
      otherSubOption.textContent = "+ Add New Topic...";
      subcategorySelect.appendChild(otherSubOption);

      customSubcategoryInput.style.display = "none";
    }
  }

  categorySelect.addEventListener("change", updateSubcategories);

  subcategorySelect.addEventListener("change", (e) => {
    if (e.target.value === "Other") {
      customSubcategoryInput.style.display = "block";
    } else {
      customSubcategoryInput.style.display = "none";
    }
  });

  updateSubcategories();

  document.getElementById("publish-btn").addEventListener("click", async () => {
    const title = document.getElementById("post-title").value.trim();
    const author = document.getElementById("author-name").value.trim();
    const role = document.getElementById("post-role").value;

    let category = categorySelect.value;
    if (category === "Other") {
      category = customCategoryInput.value.trim();
    }

    let subcategory = subcategorySelect.value;
    if (category === "Other" || subcategorySelect.value === "Other") {
      subcategory = customSubcategoryInput.value.trim();
    }

    const content = quill.root.innerHTML;
    const textLength = quill.getText().trim().length;

    // Validation check
    if (!title || !author || !category || !subcategory || textLength === 0) {
      alert(
        "Please fill in all fields completely (including custom names if selected) before publishing.",
      );
      return;
    }

    try {
      await db.collection("articles").add({
        title: title,
        author: author,
        role: role,
        category: category,
        subcategory: subcategory,
        content: content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      alert("Article Published Successfully!");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error writing document: ", error);
      alert("Failed to publish.");
    }
  });
}

// 2. Feed & Filter Logic (index.html)
const feedContainer = document.getElementById("feed-container");
if (feedContainer) {
  let currentCategory = "All";
  let currentSubcategory = "All";

  async function loadArticles() {
    feedContainer.innerHTML = "<p>Loading articles...</p>";
    let query = db.collection("articles").orderBy("createdAt", "desc");

    if (currentCategory !== "All") {
      query = query.where("category", "==", currentCategory);
      if (currentSubcategory !== "All") {
        query = query.where("subcategory", "==", currentSubcategory);
      }
    }

    try {
      const snapshot = await query.get();
      feedContainer.innerHTML = "";

      if (snapshot.empty) {
        feedContainer.innerHTML =
          "<p>No articles found matching this selection.</p>";
        return;
      }

      snapshot.forEach((doc) => {
        const article = doc.data();
        const dateString = article.createdAt
          ? article.createdAt.toDate().toLocaleDateString()
          : "Just now";

        const articleCard = `
                    <article class="card">
                        <div class="card-meta">
                            <span class="badge role-${article.role.toLowerCase()}">${article.role}</span>
                            <span class="badge category">${article.category} / ${article.subcategory}</span>
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
      feedContainer.innerHTML = "<p>Error loading feed.</p>";
    }
  }

  async function updateDynamicMainCategories() {
    const mainFilterContainer = document.getElementById("main-category-filter");
    try {
      const snapshot = await db.collection("articles").get();
      const dynamicCategories = new Set(Object.keys(subcategoriesMap));

      snapshot.forEach((doc) => {
        if (doc.data().category) {
          dynamicCategories.add(doc.data().category);
          if (doc.data().subcategory) {
            if (!subcategoriesMap[doc.data().category]) {
              subcategoriesMap[doc.data().category] = [];
            }
            if (
              !subcategoriesMap[doc.data().category].includes(
                doc.data().subcategory,
              )
            ) {
              subcategoriesMap[doc.data().category].push(
                doc.data().subcategory,
              );
            }
          }
        }
      });

      mainFilterContainer.innerHTML =
        '<button class="filter-btn active" data-filter="All">All</button>';
      dynamicCategories.forEach((cat) => {
        const btn = document.createElement("button");
        btn.className = "filter-btn";
        btn.dataset.filter = cat;
        btn.textContent = cat;
        mainFilterContainer.appendChild(btn);
      });

      document
        .querySelectorAll("#main-category-filter .filter-btn")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            document
              .querySelectorAll("#main-category-filter .filter-btn")
              .forEach((b) => b.classList.remove("active"));
            e.target.classList.add("active");
            currentCategory = e.target.dataset.filter;
            currentSubcategory = "All";
            updateSubcategoryFilterUI(currentCategory);
            loadArticles();
          });
        });
    } catch (err) {
      console.error("Could not fetch dynamic categories", err);
    }
  }

  function updateSubcategoryFilterUI(category) {
    const subFilterContainer = document.getElementById("subcategory-filter");
    subFilterContainer.innerHTML =
      '<button class="sub-filter-btn active" data-sub="All">All Topics</button>';

    if (category !== "All" && subcategoriesMap[category]) {
      subcategoriesMap[category].forEach((sub) => {
        const btn = document.createElement("button");
        btn.className = "sub-filter-btn";
        btn.dataset.sub = sub;
        btn.textContent = sub;
        subFilterContainer.appendChild(btn);
      });
    }

    document.querySelectorAll(".sub-filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".sub-filter-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        currentSubcategory = e.target.dataset.sub;
        loadArticles();
      });
    });
  }

  updateDynamicMainCategories().then(() => {
    updateSubcategoryFilterUI("All");
    loadArticles();
  });
}
