const testCors = async () => {
    try {
        const r = await fetch("https://firebasestorage.googleapis.com/v0/b/wovn-catalog.firebasestorage.app/o?name=mockups/test.png", {
            method: "OPTIONS",
            headers: {
                "Origin": "https://wovn-garment-catalog.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,x-firebase-storage-version"
            }
        });
        console.log("Status:", r.status);
        console.log("Headers:", [...r.headers.entries()]);
        console.log("Body:", await r.text());
    } catch (e) {
        console.error(e);
    }
}
testCors();
