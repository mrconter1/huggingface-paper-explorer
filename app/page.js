import axios from 'axios';

export default async function Home() {
  const url = 'https://huggingface.co/papers?date=2024-10-10';
  
  // Fetch HTML content from the Hugging Face URL
  let htmlContent = '';

  try {
    const response = await axios.get(url);
    htmlContent = response.data;
  } catch (error) {
    console.error('Error fetching HTML:', error);
    htmlContent = '<p>An error occurred while fetching the HTML.</p>';
  }

  return (
    <main>
      <h1>HTML Content</h1>
      {/* Display the fetched HTML content */}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </main>
  );
}