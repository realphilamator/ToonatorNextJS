(function () {
  const path = window.location.pathname.replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);

  function loadPage(file) {
    fetch(file)
      .then(r => r.text())
      .then(html => {
        document.open();
        document.write(html);
        document.close();
      });
  }

  // /toon/:id
  if (parts[0] === "toon" && parts[1]) {
    const id = encodeURIComponent(parts[1]);
    return loadPage(`/pages/toon.html?id=${id}`);
  }

  // /user/:username
  if (parts[0] === "user" && parts[1]) {
    const username = encodeURIComponent(parts[1]);
    return loadPage(`/pages/user.html?username=${username}`);
  }

  // /last
  if (path === "/last") {
    return loadPage("/pages/last.html");
  }

  // /colorful
  if (path === "/colorful") {
    return loadPage("/pages/last.html?view=colorful");
  }

  // /sandbox
  if (path === "/sandbox") {
    return loadPage("/pages/last.html?view=sandbox");
  }

  // /messages
  if (path === "/messages") {
    return loadPage("/pages/messages.html");
  }

})();