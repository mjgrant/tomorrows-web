// Theme toggle button
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Check saved preference
if (localStorage.getItem("theme") === "light") {
  body.classList.add("light-mode");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("light-mode");

  if (body.classList.contains("light-mode")) {
    themeToggle.textContent = "☀️";
    localStorage.setItem("theme", "light");
  } else {
    themeToggle.textContent = "🌙";
    localStorage.setItem("theme", "dark");
  }
});
