document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector("#sidebar");
  document
    .querySelector("[data-sidebar-toggle]")
    ?.addEventListener("click", () => sidebar?.classList.toggle("open"));
  document.querySelectorAll("[data-table-search]").forEach((input) =>
    input.addEventListener("input", () => {
      document
        .querySelectorAll(`${input.dataset.tableSearch} tbody tr`)
        .forEach((row) => {
          row.hidden = !row.textContent
            .toLowerCase()
            .includes(input.value.toLowerCase());
        });
    }),
  );
});
