// Static sample rows for the custom-HTML reference view. The view contract
// (newsnext.widget.data / status / size messages) is what this example
// demonstrates; the producer only supplies a few fixed rows.
export default function load() {
  return {
    observations: {
      rows: [
        { label: "Technology", value: 84 },
        { label: "Science", value: 62 },
        { label: "Design", value: 48 },
        { label: "Business", value: 35 },
      ],
    },
  }
}
