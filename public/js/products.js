document.addEventListener("DOMContentLoaded", () => {
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("productSubmitBtn");
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      const formData = new FormData(productForm);
      const data = Object.fromEntries(formData.entries());
      const url = productForm.action;
      const method = document.getElementById("formMethod").value;

      try {
        const res = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          window.location.reload();
        } else {
          const errData = await res.json();
          alert(
            errData.error ||
              errData.message ||
              "An error occurred while saving the product.",
          );
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      } catch (err) {
        console.error(err);
        alert("Network error. Please try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
});
