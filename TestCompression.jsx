import React from "react";
import imageCompression from "browser-image-compression";

const TestCompression = () => {
  console.log("Browser Image Compression Loaded:", imageCompression);
  return <div>Testing Compression...</div>;
};

export default TestCompression;