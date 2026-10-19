/**
 * Customer management client-side handler
 * Provides modal open/close, client-side validation, AJAX submission,
 * and live DOM updates without requiring manual browser reload.
 */

function openCustomerModal(customer) {
  const form = document.getElementById("customerForm");
  const title = document.getElementById("customerModalTitle");
  const subtitle = document.getElementById("customerModalSubtitle");
  const submitBtn = document.getElementById("customerSubmitBtn");
  const methodField = document.getElementById("cFormMethod");
  const idField = document.getElementById("c_id");
  const alertBox = document.getElementById("customerModalAlert");

  if (alertBox) {
    alertBox.style.display = "none";
    alertBox.textContent = "";
  }

  if (customer && customer.id) {
    if (title) title.textContent = "Edit customer";
    if (subtitle) subtitle.textContent = "Update customer contact details and address.";
    if (submitBtn) {
      submitBtn.textContent = "Save changes";
      submitBtn.disabled = false;
    }
    if (form) form.action = "/customers/" + customer.id;
    if (methodField) methodField.value = "PUT";
    if (idField) idField.value = customer.id;

    // Pre-populate with existing details; do not leave blank or show placeholders when values exist
    const nameInput = document.getElementById("c_name");
    const emailInput = document.getElementById("c_email");
    const phoneInput = document.getElementById("c_phone");
    const addressInput = document.getElementById("c_address");

    if (nameInput) nameInput.value = customer.name || "";
    if (emailInput) emailInput.value = customer.email || "";
    if (phoneInput) phoneInput.value = customer.phone || "";
    if (addressInput) addressInput.value = customer.address || "";
  } else {
    if (title) title.textContent = "Add customer";
    if (subtitle) subtitle.textContent = "Add a new customer to your directory.";
    if (submitBtn) {
      submitBtn.textContent = "Add customer";
      submitBtn.disabled = false;
    }
    if (form) {
      form.action = "/customers";
      form.reset();
    }
    if (methodField) methodField.value = "POST";
    if (idField) idField.value = "";

    const nameInput = document.getElementById("c_name");
    const emailInput = document.getElementById("c_email");
    const phoneInput = document.getElementById("c_phone");
    const addressInput = document.getElementById("c_address");

    if (nameInput) nameInput.value = "";
    if (emailInput) emailInput.value = "";
    if (phoneInput) phoneInput.value = "";
    if (addressInput) addressInput.value = "";
  }

  const backdrop = document.getElementById("customerModalBackdrop");
  if (backdrop) {
    backdrop.classList.add("open");
  }
  const nameInput = document.getElementById("c_name");
  if (nameInput) {
    setTimeout(() => nameInput.focus(), 60);
  }
}

function closeCustomerModal() {
  const backdrop = document.getElementById("customerModalBackdrop");
  if (backdrop) {
    backdrop.classList.remove("open");
  }
  const alertBox = document.getElementById("customerModalAlert");
  if (alertBox) {
    alertBox.style.display = "none";
    alertBox.textContent = "";
  }
}

function showFlashNotification(message, type = "success") {
  const main = document.querySelector(".app-content") || document.body;
  const existing = document.getElementById("customer-dynamic-flash");
  if (existing) existing.remove();

  const flash = document.createElement("div");
  flash.id = "customer-dynamic-flash";
  flash.className = "flash " + (type === "success" ? "flash-success" : "flash-error");
  flash.textContent = message;

  if (main.firstChild) {
    main.insertBefore(flash, main.firstChild);
  } else {
    main.appendChild(flash);
  }

  setTimeout(() => {
    if (flash && flash.parentNode) {
      flash.style.opacity = "0";
      flash.style.transition = "opacity 0.4s ease";
      setTimeout(() => flash.remove(), 400);
    }
  }, 4000);
}

document.addEventListener("DOMContentLoaded", () => {
  const customerForm = document.getElementById("customerForm");
  const backdrop = document.getElementById("customerModalBackdrop");

  // Backdrop click to close
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeCustomerModal();
      }
    });
  }

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop && backdrop.classList.contains("open")) {
      closeCustomerModal();
    }
  });

  if (customerForm) {
    customerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("customerSubmitBtn");
      const alertBox = document.getElementById("customerModalAlert");
      const methodField = document.getElementById("cFormMethod");
      const originalText = submitBtn ? submitBtn.textContent : "Save";

      if (alertBox) {
        alertBox.style.display = "none";
        alertBox.textContent = "";
      }

      const name = document.getElementById("c_name").value.trim();
      const email = document.getElementById("c_email").value.trim();
      const phone = document.getElementById("c_phone").value.trim();
      const address = document.getElementById("c_address").value.trim();

      if (!name) {
        if (alertBox) {
          alertBox.textContent = "Please enter a customer name.";
          alertBox.style.display = "block";
        }
        return;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (alertBox) {
          alertBox.textContent = "Please enter a valid email address.";
          alertBox.style.display = "block";
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
      }

      const url = customerForm.action;
      const method = methodField ? methodField.value.toUpperCase() : "POST";
      const payload = {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
      };

      try {
        const res = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const resData = await res.json();
          const updated = resData.customer || resData;
          closeCustomerModal();

          if (method === "PUT" && updated && updated.id) {
            // Update customer list view row in-place if present
            const row = document.getElementById("customer-row-" + updated.id);
            if (row) {
              const nameCell = row.querySelector(".customer-col-name");
              const emailCell = row.querySelector(".customer-col-email");
              const phoneCell = row.querySelector(".customer-col-phone");
              const editBtn = row.querySelector(".action-edit");

              if (nameCell) nameCell.textContent = updated.name;
              if (emailCell) emailCell.textContent = updated.email || "—";
              if (phoneCell) phoneCell.textContent = updated.phone || "—";

              if (editBtn) {
                let currentCust = {};
                try {
                  currentCust = JSON.parse(decodeURIComponent(editBtn.dataset.customer || "{}"));
                } catch (_) {}
                const merged = Object.assign({}, currentCust, updated);
                editBtn.dataset.customer = encodeURIComponent(JSON.stringify(merged));
              }

              // Subtle highlight animation for updated row
              row.style.transition = "background-color 0.3s ease";
              row.style.backgroundColor = "rgba(16, 185, 129, 0.12)";
              setTimeout(() => {
                row.style.backgroundColor = "";
              }, 1200);
            }

            // Update customer details view (show.ejs) in-place if present
            const showTitle = document.getElementById("customer-show-title");
            const showName = document.getElementById("customer-show-name");
            const showEmail = document.getElementById("customer-show-email");
            const showPhone = document.getElementById("customer-show-phone");
            const showAddress = document.getElementById("customer-show-address");
            const showEditBtn = document.getElementById("edit-customer-show-btn");

            if (showTitle) showTitle.textContent = updated.name;
            if (showName) showName.textContent = updated.name;
            if (showEmail) showEmail.textContent = updated.email || "—";
            if (showPhone) showPhone.textContent = updated.phone || "—";
            if (showAddress) showAddress.textContent = updated.address || "—";
            if (showEditBtn) {
              let currentCust = {};
              try {
                currentCust = JSON.parse(decodeURIComponent(showEditBtn.dataset.customer || "{}"));
              } catch (_) {}
              const merged = Object.assign({}, currentCust, updated);
              showEditBtn.dataset.customer = encodeURIComponent(JSON.stringify(merged));
            }

            showFlashNotification("Customer updated successfully.");
          } else {
            // Newly created customer: reload immediately without manual browser reload
            window.location.reload();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || errData.message || "An error occurred while saving the customer.";
          if (alertBox) {
            alertBox.textContent = errMsg;
            alertBox.style.display = "block";
          } else {
            alert(errMsg);
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
        }
      } catch (err) {
        console.error(err);
        if (alertBox) {
          alertBox.textContent = "Network error. Please try again.";
          alertBox.style.display = "block";
        } else {
          alert("Network error. Please try again.");
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }
});
