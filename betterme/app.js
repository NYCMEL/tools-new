document.addEventListener("DOMContentLoaded", () => {
  const choices = document.querySelectorAll(".choice");

  choices.forEach((choice) => {
    choice.addEventListener("click", () => {
      choices.forEach((item) => {
        item.classList.remove("is-selected");
        item.querySelector(".radio").textContent = "";
      });

      choice.classList.add("is-selected");
      choice.querySelector(".radio").textContent = "✓";

      setTimeout(() => {
        window.location.href = "solution.html";
      }, 300);
    });
  });
});
