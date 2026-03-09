const test = async () => {
    try {
        const response = await fetch('https://wovn-garment-catalog.vercel.app/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" })
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
