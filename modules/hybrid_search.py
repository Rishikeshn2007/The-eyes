from face_search import Face_search
from semantic_search import Semantic_search


class Hybrid_search(Face_search, Semantic_search):

    def hybrid_search(self, reference_image, text, threshold=0.4, top_k=5):
        # step 1: find photos containing this face
        face_result = self.search_face(reference_image, threshold=threshold)
        if not face_result.get("found"):
            return face_result  # no face match, return the error

        paths = {p["photo_path"] for p in face_result.get("photos", [])}
        
        # step 2: search all photos, then keep only the face-matched ones
        all_results = self.semantic_search(text, top_k=100000)
        results = [(p, s) for p, s in all_results if p in paths]
        return results[:top_k]
