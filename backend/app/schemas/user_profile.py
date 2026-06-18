from pydantic import BaseModel, Field


class LmsProfileMeOut(BaseModel):
    optimate_id: str = ""
    full_name: str = ""
    avatar_url: str = ""
    about_me: str = ""
    role: str = ""


class LmsProfileMeUpdate(BaseModel):
    about_me: str | None = Field(default=None, max_length=5000)


class LmsProfileLookupIn(BaseModel):
    optimate_ids: list[str] = Field(default_factory=list, max_length=200)


class LmsProfilePublicOut(BaseModel):
    optimate_id: str
    full_name: str = ""
    avatar_url: str = ""
    about_me: str = ""
    role: str = ""


class LmsProfileLookupOut(BaseModel):
    profiles: dict[str, LmsProfilePublicOut]
