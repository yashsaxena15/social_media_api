from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import PostSerializer
from .models import Post
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
    serializer = PostSerializer(instance = result_page, many = True)
    
    return paginator.get_paginated_response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_detail(request,post_id):
    
    try:
        post = Post.objects.get(id = post_id)
        
    except Post.DoesNotExist:
        return Response({"error":"Post does not exist"}, status=status.HTTP_404_NOT_FOUND)

    serializer = PostSerializer(instance = post)
    
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