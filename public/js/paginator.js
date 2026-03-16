// Paginator Component
export function renderPaginator(
  totalPages,
  username,
  currentPage = 1,
  containerId = "paginator",
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const maxShow = 5;
  const shown = Math.min(totalPages, maxShow);
  let items = "";

  for (let i = 1; i <= shown; i++) {
    if (i === currentPage) {
      items += `<li class="current"><a href="/user/${encodeURIComponent(username)}/?page=${i}">${i}</a></li>`;
    } else {
      items += `<li><a href="/user/${encodeURIComponent(username)}/?page=${i}">${i}</a></li>`;
    }
  }

  if (totalPages > maxShow) items += '<li class="dots">...</li>';

  container.innerHTML = `<div class="paginator"><ul class="paginator">${items}</ul><div style="clear:both"></div></div>`;
}

export function calculateTotalPages(totalItems, itemsPerPage = 12) {
  return Math.ceil(totalItems / itemsPerPage);
}

export function getCurrentPageFromURL() {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get("page") || "1");
  return Math.max(1, page);
}
