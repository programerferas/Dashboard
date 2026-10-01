// The search box. Controlled by the page, which debounces the value before it
// calls the API (see useDebounce).
import Icon from "./Icon.jsx";

export const SearchInput = ({ value, onChange, placeholder = "بحث...", ...props }) => (
  <div className="search">
    <Icon name="search" />
    <input
      className="input"
      type="search"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-label={placeholder}
      {...props}
    />
    {value ? (
      <button
        type="button"
        className="search__clear"
        onClick={() => onChange("")}
        aria-label="مسح البحث"
      >
        <Icon name="close" style={{ width: 13, height: 13 }} />
      </button>
    ) : null}
  </div>
);

export default SearchInput;
