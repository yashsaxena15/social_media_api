from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import PostSerializer
from .models import Post, Like
from rest_framework.pagination import PageNumberPagination
# Create your views here.

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_post(request):
    
    serializer = PostSerializer(data = request.data)

    if serializer.is_valid():
        serializer.save(user=request.user)  # it will bind the created post with logged in user and save in db
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_list(request):
    
    post = Post.objects.filter(user=request.user) # get all the posts of currently logged in user

    paginator = PageNumberPagination()
    paginator.page_size = 5
    
    result_page = paginator.paginate_queryset(queryset=post, request=request)
    serializer = PostSerializer(instance = result_page, many = True, context = {"request": request}) # for sending request to serializer
    
    return paginator.get_paginated_response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_detail(request,post_id):
    
    try:
        post = Post.objects.get(id = post_id)
        
    except Post.DoesNotExist:
        return Response({"error":"Post does not exist"}, status=status.HTTP_404_NOT_FOUND)

    serializer = PostSerializer(instance = post, context = {"request": request})
    
    return Response(serializer.data)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_post(request, post_id):

    try :
        post = Post.objects.get(id = post_id)
        
    except Post.DoesNotExist:
        return Response({"error":"Post does not exist"}, status=status.HTTP_404_NOT_FOUND)
    
    if post.user != request.user:  # this insure that user updating his own profile only
        return Response({"error":"You cannot edit this post!"}, status= status.HTTP_403_FORBIDDEN)

    serializer = PostSerializer(instance = post, data = request.data, partial = True) # partial ---> update only provided fields

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_post(request, post_id):
    
    try :
        post = Post.objects.get(id = post_id)
    
    except Post.DoesNotExist:
        return Response({"error":"Post does not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if post.user != request.user:  # this insure that user updating his own profile only
        return Response({"error":"You cannot edit this post!"}, status= status.HTTP_403_FORBIDDEN)
    
    post.delete()

    return Response({"message":"Post deleted"}, status= status.HTTP_204_NO_CONTENT)

# ------Like Toggle ------

@api_view(['POST'])
@permission_classes([IsAuthenticated])

def toggle_like(request, post_id):

    post = get_object_or_404(Post, id = post_id) # give that post object or 404 error
    like = Like.objects.filter(user=request.user, post=post).first() # it will give us the first object of queryset and we check whether queryset is empty (None) or has an object

    # like = Like.objects.filter(user_id = request.user.id, post_id = post.id).first()  # we can also use this we are checking using user id and post id, user_id and post_id are auto created by django when any model has foreinkey relation with other.
    
    if like is not None:
        like.delete()
        return Response({"message":"Post disliked"}, status=status.HTTP_200_OK)
    else:
        Like.objects.create(user=request.user, post=post)
        return Response({"message":"Post liked"}, status=status.HTTP_201_CREATED)