'use client'; // This enables the component to use client-side code like styled-jsx

import axios from 'axios';
import { load } from 'cheerio';

export default async function Home() {
  const url = 'https://huggingface.co/papers?date=2024-10-10';
  
  // Fetch the HTML content from the URL
  let papers = [];

  try {
    const { data: html } = await axios.get(url);

    // Load the HTML into cheerio for parsing
    const $ = load(html);

    // Parse each paper
    $('.grid .relative').each((index, element) => {
      const title = $(element).find('h3 a').text().trim();
      const image = $(element).find('img').attr('src');
      const upvotes = $(element).find('.leading-none').text().trim();

      papers.push({
        title,
        image,
        upvotes,
      });
    });
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }

  return (
    <main>
      <h1>Hugging Face Papers</h1>
      <div className="paper-grid">
        {papers.length > 0 ? (
          papers.map((paper, index) => (
            <div key={index} className="paper-card">
              <img src={paper.image} alt={paper.title} />
              <h3>{paper.title}</h3>
              <p>Upvotes: {paper.upvotes}</p>
            </div>
          ))
        ) : (
          <p>No papers found.</p>
        )}
      </div>

      <style jsx>{`
        .paper-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .paper-card {
          border: 1px solid #eaeaea;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .paper-card img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .paper-card h3 {
          margin-bottom: 10px;
        }
      `}</style>
    </main>
  );
}