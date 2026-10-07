from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

import crud, schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter()


@router.post("/auth/signup")
def signup(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, data.email):
        raise HTTPException(400, "Email already registered")
    u = crud.create_user(db, data.email, data.password)
    sess = crud.create_session(db, data.email)
    return {"email": u.email, "token": sess.token}


@router.post("/auth/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    u = crud.verify_user(db, data.email, data.password)
    if not u:
        raise HTTPException(401, "Invalid credentials")
    sess = crud.create_session(db, data.email)
    return {"email": u.email, "token": sess.token}


@router.post("/auth/logout")
def logout(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    crud.delete_session(db, authorization.replace("Bearer ", ""))
    return {"ok": True}


@router.get("/auth/me")
def me(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    token = authorization.replace("Bearer ", "")
    sess = crud.get_valid_session(db, token)
    if not sess:
        raise HTTPException(401, "Invalid or expired session")
    return {"email": sess.user_email}
