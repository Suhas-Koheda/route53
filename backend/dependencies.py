from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

import crud
from database import get_db


def get_current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> str:
    token = authorization.replace("Bearer ", "")
    sess = crud.get_valid_session(db, token)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return sess.user_email
