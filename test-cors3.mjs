const testCors = async () => {
    try {
        const r = await fetch("https://firebasestorage.googleapis.com/v0/b/wovn-catalog.firebasestorage.app/o?name=mockups/test.png", {
            method: "OPTIONS",
            headers: {
                "Origin": "https://wovn-garment-catalog.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type,x-firebase-storage-version,x-goog-upload-protocol"
            }
        });
        console.log("Status:", r.status);
        console.log("Headers:", [...r.headers.entries()]);
    } catch (e) {
        console.error(e);
    }
}
testCors();
