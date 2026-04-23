exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const token = process.env.HUGGING_FACE_API_TOKEN;

    if (!token) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing HUGGING_FACE_API_TOKEN",
        }),
      };
    }

    const contentType =
      event.headers["content-type"] ||
      event.headers["Content-Type"] ||
      "application/octet-stream";

    const imageBuffer = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "binary");

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/google/vit-base-patch16-224",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
          Accept: "application/json",
        },
        body: imageBuffer,
      }
    );

    const rawText = await hfResponse.text();

    console.log("HF status:", hfResponse.status);
    console.log("HF content-type:", hfResponse.headers.get("content-type"));
    console.log("HF raw response:", rawText);

    return {
      statusCode: hfResponse.ok ? 200 : 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: hfResponse.ok,
        upstreamStatus: hfResponse.status,
        upstreamContentType: hfResponse.headers.get("content-type"),
        raw: rawText,
      }),
    };
  } catch (error) {
    console.log("Function error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};
