// Test script

async function test() {
  console.log("Test /api/eq (Without LM Studio running ideally)");
  try {
    const res = await fetch("http://localhost:3001/api/eq", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        state: {
          headphone: "hd600",
          selectedArtists: ["daft_punk"],
          bass: "punchy",
          targetCurve: "harman"
        }
      })
    });
    const data = await res.json();
    console.log("Risposta:", JSON.stringify(data.payload, null, 2));
    console.log("Messaggio AI:", data.aiMessage);
  } catch(e) {
    console.error(e);
  }
}
test();
