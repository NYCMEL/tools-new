document.addEventListener("DOMContentLoaded", function () {
  var choices = document.querySelectorAll(".choice");

  choices.forEach(function (choice) {
    choice.addEventListener("click", function () {
      choices.forEach(function (item) {
        item.classList.remove("is-selected");
        item.querySelector(".radio").textContent = "";
      });

      choice.classList.add("is-selected");
      choice.querySelector(".radio").textContent = "✓";
    });
  });
});const choices = document.querySelectorAll(".choice");

choices.forEach((choice) => {
  choice.addEventListener("click", () => {
    choices.forEach((item) => {
      item.classList.remove("is-selected");
      item.querySelector(".radio").textContent = "";
    });

    choice.classList.add("is-selected");
    choice.querySelector(".radio").textContent = "✓";
  });
});

