Clustering Optimization – Testing Update

- Problem: Brute-force vector search scans every embedding, which may become expensive as the database grows.
- Solution: Implemented K-Means clustering with multi-cluster probing to reduce the number of candidate embeddings searched.
- Testing: Achieved 93.9% Recall@10 for face search and 94% for semantic search with default "probe_k" settings. Increasing "probe_k" improved recall to approximately 99%.
- New issue identified: At the current dataset size (491 face vectors and 119 semantic vectors), clustered search takes 3–5 ms, whereas brute-force search takes only 0.03–0.09 ms. SQLite query overhead currently outweighs the savings from reduced vector comparisons.