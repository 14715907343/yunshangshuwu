let currentBookTitle = "";
let currentChapterIndex = 0;
let readerFontSize = 20;
let selectedCategory = "全部";

const books = {
  "西游记": xiyoujiBook
};

function openBook(title) {
  const book = books[title];

  if (!book) {
    alert("这本书还没有添加章节内容。");
    return;
  }

  currentBookTitle = title;
  currentChapterIndex = 0;

  document.getElementById("readerTitle").innerText = title;
  document.getElementById("readerContent").innerText = book.intro;

  document.getElementById("readerControls").style.display = "none";
  hideReadingProgress();
  hideBottomToolbar();

  updateContinueButton(title);

  const chapterList = document.getElementById("chapterList");
  chapterList.style.display = "flex";
  chapterList.innerHTML = "";

  book.chapters.forEach(function (chapter, index) {
    const button = document.createElement("button");
    button.innerText = chapter.title;
    button.className = "chapter-button";

    button.onclick = function () {
      openChapter(index);
    };

    chapterList.appendChild(button);
  });

  document.getElementById("reader").scrollIntoView({
    behavior: "smooth"
  });
}

function openChapter(index) {
  const book = books[currentBookTitle];
  const chapter = book.chapters[index];

  currentChapterIndex = index;

  document.getElementById("readerTitle").innerText = chapter.title;
  document.getElementById("readerContent").innerText = chapter.content;

  document.getElementById("chapterList").style.display = "none";
  document.getElementById("readerControls").style.display = "flex";

showBottomToolbar();

  updateButtons();
  updateReadingProgress();
  saveReadingProgress();

  document.getElementById("reader").scrollIntoView({
    behavior: "smooth"
  });
}

function prevChapter() {
  if (currentChapterIndex > 0) {
    openChapter(currentChapterIndex - 1);
  }
}

function nextChapter() {
  const book = books[currentBookTitle];

  if (currentChapterIndex < book.chapters.length - 1) {
    openChapter(currentChapterIndex + 1);
  }
}

function showChapterList() {
  const book = books[currentBookTitle];

  document.body.classList.remove("immersive-mode");

  const immersiveButton = document.getElementById("immersiveButton");
  if (immersiveButton) {
    immersiveButton.innerText = "沉浸";
  }

  document.getElementById("readerTitle").innerText = currentBookTitle;
  document.getElementById("readerContent").innerText = book.intro;

  document.getElementById("readerControls").style.display = "none";
  document.getElementById("chapterList").style.display = "flex";
  hideReadingProgress();
  hideBottomToolbar();

  document.getElementById("reader").scrollIntoView({
    behavior: "smooth"
  });
}

function updateButtons() {
  const book = books[currentBookTitle];

  document.getElementById("prevButton").disabled = currentChapterIndex === 0;
  document.getElementById("nextButton").disabled =
    currentChapterIndex === book.chapters.length - 1;
}

const searchInput = document.getElementById("searchInput");
const bookCards = document.querySelectorAll(".book-card");
const categoryButtons = document.querySelectorAll(".category-button");

function filterBooks() {
  const keyword = searchInput.value.toLowerCase();

  bookCards.forEach(function (card) {
    const title = card.dataset.title.toLowerCase();
    const category = card.dataset.category;

    const matchKeyword = title.includes(keyword);
    const matchCategory =
      selectedCategory === "全部" || category === selectedCategory;

    if (matchKeyword && matchCategory) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

searchInput.addEventListener("input", filterBooks);

categoryButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    selectedCategory = button.dataset.category;

    categoryButtons.forEach(function (btn) {
      btn.classList.remove("active");
    });

    button.classList.add("active");
    filterBooks();
  });
});
function toggleNightMode() {
  document.body.classList.toggle("night-mode");

  const isNightMode = document.body.classList.contains("night-mode");
  const nightModeButton = document.getElementById("nightModeButton");

  if (isNightMode) {
    nightModeButton.innerText = "日间模式";
  } else {
    nightModeButton.innerText = "夜间模式";
  }
}

function increaseFontSize() {
  if (readerFontSize < 30) {
    readerFontSize += 2;
    updateFontSize();
  }
}

function decreaseFontSize() {
  if (readerFontSize > 14) {
    readerFontSize -= 2;
    updateFontSize();
  }
}

function updateFontSize() {
  document.getElementById("readerContent").style.fontSize = readerFontSize + "px";
  document.getElementById("fontSizeLabel").innerText = readerFontSize + "px";
}
function saveReadingProgress() {
  const progress = {
    bookTitle: currentBookTitle,
    chapterIndex: currentChapterIndex
  };

  localStorage.setItem("readingProgress", JSON.stringify(progress));
  renderRecentReading();
}

function getReadingProgress() {
  const saved = localStorage.getItem("readingProgress");

  if (!saved) {
    return null;
  }

  return JSON.parse(saved);
}

function updateContinueButton(bookTitle) {
  const progress = getReadingProgress();
  const button = document.getElementById("continueButton");

  if (progress && progress.bookTitle === bookTitle) {
    button.style.display = "inline-block";
    button.innerText = "继续阅读：第 " + (progress.chapterIndex + 1) + " 回";
  } else {
    button.style.display = "none";
  }
}

function continueReading() {
  const progress = getReadingProgress();

  if (!progress) {
    alert("还没有阅读记录");
    return;
  }

  currentBookTitle = progress.bookTitle;
  openChapter(progress.chapterIndex);
}
function getShelf() {
  const shelf = localStorage.getItem("myShelf");

  if (!shelf) {
    return [];
  }

  return JSON.parse(shelf);
}

function addToShelf(bookTitle) {
  let shelf = getShelf();

  if (!shelf.includes(bookTitle)) {
    shelf.push(bookTitle);
    localStorage.setItem("myShelf", JSON.stringify(shelf));
    alert("已加入书架：" + bookTitle);
  } else {
    alert("这本书已经在书架里了");
  }

  renderShelf();
}

function renderShelf() {
  const shelfGrid = document.getElementById("shelfGrid");

  if (!shelfGrid) {
    return;
  }

  const shelf = getShelf();

  if (shelf.length === 0) {
    shelfGrid.innerHTML = "<p>你的书架还是空的。</p>";
    return;
  }

  shelfGrid.innerHTML = "";

  shelf.forEach(function (bookTitle) {
    const card = document.createElement("div");
    card.className = "book-card";

    card.innerHTML = `
      <div class="book-cover">${bookTitle}</div>
      <h3>${bookTitle}</h3>
      <p>已加入书架</p>
      <button onclick="openBook('${bookTitle}')">继续阅读</button>
      <button onclick="removeFromShelf('${bookTitle}')">移出书架</button>
    `;

    shelfGrid.appendChild(card);
  });
}

function removeFromShelf(bookTitle) {
  let shelf = getShelf();

  shelf = shelf.filter(function (title) {
    return title !== bookTitle;
  });

  localStorage.setItem("myShelf", JSON.stringify(shelf));
  renderShelf();
}
renderShelf();
renderRecentReading();
function updateReadingProgress() {
  const book = books[currentBookTitle];

  if (!book) {
    return;
  }

  const totalChapters = book.chapters.length;
  const current = currentChapterIndex + 1;
  const percent = Math.round((current / totalChapters) * 100);

  document.getElementById("readingProgress").style.display = "block";
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").innerText = "阅读进度：" + percent + "%";
  document.getElementById("chapterText").innerText =
    "第 " + current + " / " + totalChapters + " 回";
}

function hideReadingProgress() {
  document.getElementById("readingProgress").style.display = "none";
}
function showBottomToolbar() {
  const toolbar = document.getElementById("bottomReaderToolbar");

  if (toolbar) {
    toolbar.classList.add("show");
  }
}

function hideBottomToolbar() {
  const toolbar = document.getElementById("bottomReaderToolbar");

  if (toolbar) {
    toolbar.classList.remove("show");
  }
}

function toggleImmersiveMode() {
  document.body.classList.toggle("immersive-mode");

  const button = document.getElementById("immersiveButton");
  const isImmersive = document.body.classList.contains("immersive-mode");

  if (button) {
    button.innerText = isImmersive ? "退出沉浸" : "沉浸";
  }

  if (isImmersive) {
    document.getElementById("reader").scrollIntoView({
      behavior: "smooth"
    });
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

window.addEventListener("scroll", function () {
  const backToTopButton = document.getElementById("backToTopButton");

  if (!backToTopButton) {
    return;
  }

  if (window.scrollY > 500) {
    backToTopButton.classList.add("show");
  } else {
    backToTopButton.classList.remove("show");
  }
});