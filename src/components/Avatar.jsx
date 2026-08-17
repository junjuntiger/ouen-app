export default function Avatar({ url, name, size = 44, style = {} }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ""}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--green-pale)",
        color: "var(--green-primary)",
        fontWeight: "bold",
        fontSize: Math.round(size * 0.42),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      {name?.[0] ?? "?"}
    </div>
  );
}
