import sys
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import uvicorn
from backend.config import HOST, PORT

if __name__ == "__main__":
    print("================================================================")
    print(" National Legal Metrology Online Verification System (NLMVS) API ")
    print(" Powered by: FastAPI (Python 3.13)                              ")
    print(" Governed by: Legal Metrology Act, 2009 & General Rules, 2011   ")
    print(f" Server active on: http://{HOST}:{PORT}                       ")
    print("================================================================")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
